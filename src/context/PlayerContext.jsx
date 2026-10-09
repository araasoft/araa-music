/**
 * PlayerContext - Music Streaming Player with Prefetching, Caching & Batch Pagination
 *
 * Audio sources can come from direct file URLs (mp3/m4a/aac/ogg/etc.) or
 * from signed, time-limited googlevideo.com/videoplayback URLs (YouTube CDN).
 * The latter carry an `expire` query param (unix seconds) after which the
 * link stops working, and generally will NOT respond to CORS-mode requests,
 * so we skip `crossOrigin` for them.
 *
 * BATCH LOADING:
 * Long playlists are loaded in batches (e.g. 20 songs at a time) rather than
 * fetched fully upfront. `queueMeta` tracks which playlist/batch is loaded and
 * whether more remain; when the user nears the end of the queue, the next
 * batch is silently fetched and appended via `loadNextBatch`.
 *
 * ERROR CODES:
 * - MEDIA_ERR_ABORTED (1): Playback was aborted
 * - MEDIA_ERR_NETWORK (2): Network error - check URL, CORS, internet connection
 * - MEDIA_ERR_DECODE (3): Audio decode error - file is corrupted or unsupported format
 * - MEDIA_ERR_SRC_NOT_SUPPORTED (4): Source format not supported by browser
 *
 * TROUBLESHOOTING:
 * 1. Check browser console for detailed error messages
 * 2. Verify audio URLs are accessible (no 404, CORS enabled) and not expired
 * 3. Test URL directly in browser to confirm playback support
 * 4. Check network tab for failed requests
 * 5. Ensure audio source supports H.264/AAC or Vorbis/Opus codecs
 */

import React, {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSettings } from "./SettingsContext.jsx";
import { useAuth } from "../hooks/useAuth.js";
import { api } from "../lib/api.js";
import { loadNextBatch } from "../lib/playlistCache.js";
import { toast } from "react-toastify";
import { showToast } from "../utils/toast.js";

const PlayerContext = createContext(null);
const LIKES_KEY = "araamusic.likes.v1";
const HISTORY_KEY = "araamusic.history.v1";
const CACHE_EXPIRY_TIME = 4 * 60 * 60 * 1000; // 4 hours in ms
const URL_EXPIRY_BUFFER_MS = 60 * 1000; // treat a link as expired 60s before its real expiry

function loadLocalSet(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveLocalSet(key, set) {
  try {
    localStorage.setItem(key, JSON.stringify([...set]));
  } catch {
    // storage unavailable — likes stay in-memory only
  }
}

function loadLocalHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalHistory(list) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
  } catch {
    // storage unavailable — history stays in-memory only
  }
}

// Pick an index into `audios` for a given quality preference.
// Sorts by the `quality` field (bitrate-ish number) rather than trusting
// the array's incoming order, then clamps into that sorted list.
function pickQualityIndex(audios, preference) {
  const len = audios?.length ?? 0;
  if (len === 0) return -1;

  const sortedIdx = audios
    .map((a, i) => ({ i, q: typeof a?.quality === "number" ? a.quality : 0 }))
    .sort((a, b) => a.q - b.q)
    .map((x) => x.i);

  const clamp = (i) => Math.min(Math.max(i, 0), len - 1);

  switch (preference) {
    case "low":
      return sortedIdx[clamp(0)];
    case "normal":
      return sortedIdx[clamp(Math.floor(len / 2))];
    case "high":
      return sortedIdx[clamp(len - 2)];
    case "very high":
      return sortedIdx[clamp(len - 1)];
    default:
      return sortedIdx[clamp(Math.floor(len / 2))];
  }
}

// Cache entry with expiry
function createCacheEntry(data) {
  return {
    data,
    timestamp: Date.now(),
  };
}

function isCacheExpired(entry) {
  return Date.now() - entry.timestamp > CACHE_EXPIRY_TIME;
}

// Extract the `expire` (unix seconds) param some signed CDN URLs carry.
// Returns ms epoch, or null if the URL has no such param.
function getUrlExpiryMs(url) {
  try {
    const parsed = new URL(url);
    const expire = parsed.searchParams.get("expire");
    if (!expire) return null;
    const seconds = parseInt(expire, 10);
    return Number.isFinite(seconds) ? seconds * 1000 : null;
  } catch {
    return null;
  }
}

function isUrlExpired(url, bufferMs = URL_EXPIRY_BUFFER_MS) {
  const expiryMs = getUrlExpiryMs(url);
  if (!expiryMs) return false; // no expiry info on this URL type — assume fine
  return Date.now() >= expiryMs - bufferMs;
}

// googlevideo.com links generally don't answer CORS-mode ("anonymous")
// requests, so <audio crossOrigin="anonymous"> will fail to load them.
function isGoogleVideoUrl(url) {
  try {
    return /(^|\.)googlevideo\.com$/.test(new URL(url).hostname);
  } catch {
    return false;
  }
}

function applyCrossOriginForUrl(audio, url) {
  if (isGoogleVideoUrl(url)) {
    audio.removeAttribute("crossorigin");
  } else {
    audio.crossOrigin = "anonymous";
  }
}

// Safe toast notification with fallback
function safeToast(message, type = "error") {
  try {
    if (showToast?.[type]) {
      showToast[type](message);
    } else if (toast?.[type]) {
      toast[type](message);
    } else {
      console.warn(`[${type.toUpperCase()}] ${message}`);
      if (type === "error") alert(message);
    }
  } catch (err) {
    console.warn(`Toast failed: ${message}`, err);
  }
}

// Validate a playable audio URL. Accepts direct audio files AND signed
// CDN URLs (e.g. googlevideo.com/videoplayback) as long as they're
// http(s) and not already expired.
function isValidAudioUrl(url) {
  if (!url || typeof url !== "string") return false;

  try {
    const parsed = new URL(url);
    const isHttp = parsed.protocol === "https:" || parsed.protocol === "http:";
    if (!isHttp) return false;

    if (isUrlExpired(url)) {
      console.warn(
        "Audio URL signature has expired, needs a fresh fetch:",
        url,
      );
      return false;
    }

    return true; // format/codec support is the browser's job
  } catch {
    return false;
  }
}

export function PlayerProvider({ children }) {
  const audioRef = useRef(null);
  const nextAudioRef = useRef(null); // For crossfade
  const { settings } = useSettings();
  const { isAuthenticated } = useAuth();

  const [queue, setQueue] = useState([]);
  const [queueIndex, setQueueIndex] = useState(-1);
  // Batch meta for the playlist currently loaded into the queue — lets us silently fetch
  // the next batch as the user nears the end, instead of loading everything upfront.
  const [queueMeta, setQueueMeta] = useState(null);
  const batchPrefetchingRef = useRef(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.8);
  const [muted, setMuted] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState("off"); // off | all | one
  const [isFullPlayerOpen, setIsFullPlayerOpen] = useState(false);
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [likedIds, setLikedIds] = useState(() => loadLocalSet(LIKES_KEY));
  const [likedSongs, setLikedSongs] = useState([]);
  const [history, setHistory] = useState(loadLocalHistory);
  const [loading, setLoading] = useState(false);
  const [songFetching, setSongFetching] = useState(false);
  const [nowplaying, setNowPlaying] = useState(null);
  const [crossfadeDuration, setCrossfadeDuration] = useState(
    settings.crossfade || 0,
  ); // 0-10 seconds
  const [bufferedDuration, setBufferedDuration] = useState(0);
  const [networkError, setNetworkError] = useState(null);
  const [audioState, setAudioState] = useState("idle"); // idle | loading | playing | paused | error

  const currentTrack = queueIndex >= 0 ? queue[queueIndex] : null;

  const prefetchCacheRef = useRef(new Map()); // songId -> { data, timestamp }
  const prefetchingRef = useRef(new Set()); // songIds currently being fetched
  const prefetchTriggeredRef = useRef(new Set()); // songIds already triggered
  const trackIdRef = useRef(null); // always-current track id
  const fadeTimeoutRef = useRef(null); // for fade effect cleanup
  const crossfadeStartedRef = useRef(false);

  // Get audio URL with error handling
  const getAudioUrl = useCallback(async (id) => {
    if (!id) throw new Error("Song ID is required");
    try {
      const response = await api.get(`/catalog/songs/url/${id}`);

      if (!response) {
        throw new Error("No response from server");
      }

      const audios = response?.audios || response?.data?.audios || [];

      if (!Array.isArray(audios) || audios.length === 0) {
        throw new Error("No audio sources in response");
      }

      // Validate URLs
      const validAudios = audios.filter((a) => isValidAudioUrl(a?.url));
      if (validAudios.length === 0) {
        throw new Error("No valid audio URLs found");
      }

      return { ...response, audios: validAudios };
    } catch (error) {
      console.error("Error fetching audio URL for", id, ":", error.message);
      throw error;
    }
  }, []);

  // Prefetch a single song
  const prefetchSong = useCallback(
    async (song) => {
      if (!song?.id) return;
      if (song.id === trackIdRef.current) return; // Don't prefetch current track
      if (prefetchingRef.current.has(song.id)) return; // Already fetching

      // Check cache validity
      const cached = prefetchCacheRef.current.get(song.id);
      if (cached && !isCacheExpired(cached)) {
        return; // Use cached data
      }

      prefetchingRef.current.add(song.id);

      try {
        const data = await getAudioUrl(song.id);

        if (!data) {
          console.warn(`No audio data for song ${song.id}`);
          return;
        }

        const audios = data?.audios || data?.link?.audios || [];

        if (!Array.isArray(audios) || audios.length === 0) {
          console.warn(`No audio sources for song ${song.id}`);
          return;
        }

        // Verify URLs are valid
        const validAudios = audios.filter((a) => isValidAudioUrl(a?.url));
        if (validAudios.length === 0) {
          console.warn(`No valid audio URLs for song ${song.id}`);
          return;
        }

        // Store in cache with timestamp
        prefetchCacheRef.current.set(
          song.id,
          createCacheEntry({ ...data, audios: validAudios }),
        );
      } catch (error) {
        console.error(`Prefetch failed for ${song.id}:`, error.message);
      } finally {
        prefetchingRef.current.delete(song.id);
      }
    },
    [getAudioUrl],
  );

  // Get next index based on shuffle and repeat mode
  const getNextIndex = useCallback(
    (currentIdx) => {
      if (!queue.length) return -1;

      if (shuffle) {
        return Math.floor(Math.random() * queue.length);
      }

      if (currentIdx < queue.length - 1) {
        return currentIdx + 1;
      }

      if (repeatMode === "all") {
        return 0;
      }

      return -1; // End of queue, no repeat
    },
    [queue.length, shuffle, repeatMode],
  );

  const applyCrossfade = useCallback(
    (fromAudio, toAudio, duration) => {
      if (!fromAudio || !toAudio || duration <= 0) return;

      const steps = duration * 10; // 10ms per step
      let currentStep = 0;

      if (fadeTimeoutRef.current) clearInterval(fadeTimeoutRef.current);

      fadeTimeoutRef.current = setInterval(() => {
        currentStep++;
        const progress = currentStep / steps;

        fromAudio.volume = volume * (1 - progress);
        toAudio.volume = volume * progress;

        if (currentStep >= steps) {
          clearInterval(fadeTimeoutRef.current);
          fadeTimeoutRef.current = null;
          fromAudio.volume = 0;
          toAudio.volume = volume;
        }
      }, 10);
    },
    [volume],
  );

  const startCrossfadeToNext = useCallback(async () => {
    const nextIdx = getNextIndex(queueIndex);
    if (nextIdx === -1) return;
    const nextSong = queue[nextIdx];
    if (!nextSong) return;

    try {
      const data =
        prefetchCacheRef.current.get(nextSong.id)?.data ??
        (await getAudioUrl(nextSong.id));

      const audios = data?.audios || data?.link?.audios || [];
      const qIdx = pickQualityIndex(audios, settings.audioQuality);
      const chosen = qIdx >= 0 ? audios[qIdx] : null;
      if (!chosen?.url) return;

      const nextAudio = nextAudioRef.current;
      applyCrossOriginForUrl(nextAudio, chosen.url);
      nextAudio.src = chosen.url;
      nextAudio.volume = 0;
      await nextAudio.play();

      applyCrossfade(audioRef.current, nextAudio, crossfadeDuration);

      setTimeout(() => {
        // swap: next becomes current
        const oldAudio = audioRef.current;
        audioRef.current = nextAudio;
        nextAudioRef.current = oldAudio;
        oldAudio.pause();
        oldAudio.src = "";

        setQueueIndex(nextIdx);
        crossfadeStartedRef.current = false;
      }, crossfadeDuration * 1000);
    } catch (err) {
      console.error("Crossfade failed, falling back to hard switch:", err);
      crossfadeStartedRef.current = false;
    }
  }, [
    queueIndex,
    queue,
    getNextIndex,
    getAudioUrl,
    settings.audioQuality,
    crossfadeDuration,
    applyCrossfade,
  ]);

  // Prefetch upcoming 3 songs (hidden fetch)
  const prefetchUpcoming = useCallback(
    (fromSongId, count = 3) => {
      if (!queue.length || !fromSongId) return;

      const startIndex = queue.findIndex((s) => s.id === fromSongId);
      if (startIndex === -1) return;

      let index = startIndex;
      const seen = new Set([startIndex]);

      for (let i = 0; i < count; i++) {
        const nextIndex = getNextIndex(index);
        if (nextIndex === -1 || seen.has(nextIndex)) break;

        seen.add(nextIndex);
        index = nextIndex;

        const song = queue[nextIndex];
        if (song) {
          prefetchSong(song);
        }
      }
    },
    [queue, getNextIndex, prefetchSong],
  );

  // --- Batch pagination: silently fetch the next batch of the playlist
  // as the user nears the end of the currently loaded queue. ---
  useEffect(() => {
    if (!queueMeta || !queueMeta.hasMore || shuffle) return;
    if (queueIndex < queue.length - 2) return;
    if (batchPrefetchingRef.current) return;

    batchPrefetchingRef.current = true;
    loadNextBatch(queueMeta.playlistId, queueMeta.isCustom)
      .then((entry) => {
        if (!entry) return;
        setQueue(entry.songs);
        setQueueMeta((prev) =>
          prev && prev.playlistId === queueMeta.playlistId
            ? { ...prev, hasMore: entry.hasMore }
            : prev,
        );
      })
      .catch((error) => {
        console.error("Failed to load next playlist batch:", error);
      })
      .finally(() => {
        batchPrefetchingRef.current = false;
      });
  }, [queueIndex, queue.length, queueMeta, shuffle]);

  // Load user likes and history on auth
  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;

    api
      .get("/me/likes")
      .then((data) => {
        if (!cancelled) {
          setLikedSongs(data);
          setLikedIds(new Set(data.map((key) => key.id) || []));
        }
      })
      .catch((error) => console.error("Failed to load likes:", error));

    api
      .get("/me/history")
      .then((entries) => {
        if (!cancelled) setHistory(entries || []);
      })
      .catch((error) => console.error("Failed to load history:", error));

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  // Initialize audio element
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.preload = "metadata";
    }
    if (!nextAudioRef.current) {
      nextAudioRef.current = new Audio();
      nextAudioRef.current.preload = "metadata";
    }

    const audio = audioRef.current;

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);

      if (
        crossfadeDuration > 0 &&
        duration > 0 &&
        !crossfadeStartedRef.current &&
        duration - audio.currentTime <= crossfadeDuration &&
        repeatMode !== "one" // don't crossfade into itself
      ) {
        crossfadeStartedRef.current = true;
        startCrossfadeToNext();
      }
    };

    const onLoadedMetadata = () => {
      setDuration(audio.duration || 0);
      setLoading(false);
    };

    const onEnded = () => handleEnded();
    const onWaiting = () => setLoading(true);
    const onPlaying = () => {
      setLoading(false);
      setAudioState("playing");
    };

    const onError = (e) => {
      const errorCode = audio.error?.code;
      const errorMessages = {
        1: "MEDIA_ERR_ABORTED - Playback aborted",
        2: "MEDIA_ERR_NETWORK - Network error - check connection",
        3: "MEDIA_ERR_DECODE - Audio format not supported or corrupted",
        4: "MEDIA_ERR_SRC_NOT_SUPPORTED - Source format not supported by browser",
      };

      const errorMsg =
        errorMessages[errorCode] || `Unknown error (${errorCode})`;
      console.error("Audio error:", errorMsg, {
        code: errorCode,
        src: audio.src,
        networkState: audio.networkState,
        readyState: audio.readyState,
      });

      // A googlevideo link that 404s/403s mid-playback is very likely expired —
      // re-fetch a fresh link for the same track instead of just skipping.
      if (
        (errorCode === 2 || errorCode === 4) &&
        currentTrack?.id &&
        isGoogleVideoUrl(audio.src)
      ) {
        console.warn(
          "Signed URL likely expired mid-playback, refetching:",
          currentTrack.id,
        );
        prefetchCacheRef.current.delete(currentTrack.id);
        setNowPlaying(null); // forces the track-change effect to refetch on next tick
        return;
      }

      // Track network errors
      if (errorCode === 2) {
        setNetworkError({
          message: "Network error - check connection",
          timestamp: Date.now(),
          track: currentTrack?.id,
        });
      }

      // Safe toast notification
      if (errorCode === 4) {
        safeToast("Format not supported or link expired. Skipping track.");
      } else {
        safeToast(`Playback error: ${errorMsg}. Moving to next track.`);
      }

      setAudioState("error");
      setSongFetching(false);
      handleEnded();
    };

    const onLoadStart = () => {};

    const onCanPlay = () => {
      setLoading(false);
      setAudioState("playing");
      setNetworkError(null);
    };

    const onProgress = () => {
      if (audio.buffered.length > 0) {
        const buffered = audio.buffered.end(audio.buffered.length - 1);
        setBufferedDuration(buffered);
      }
    };

    const onStalled = () => {
      console.warn("Audio playback stalled - checking network...");
      setAudioState("loading");
    };

    const onSuspend = () => {
      console.log("Audio data fetching suspended");
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("waiting", onWaiting);
    audio.addEventListener("playing", onPlaying);
    audio.addEventListener("error", onError);
    audio.addEventListener("loadstart", onLoadStart);
    audio.addEventListener("canplay", onCanPlay);
    audio.addEventListener("progress", onProgress);
    audio.addEventListener("stalled", onStalled);
    audio.addEventListener("suspend", onSuspend);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("waiting", onWaiting);
      audio.removeEventListener("playing", onPlaying);
      audio.removeEventListener("error", onError);
      audio.removeEventListener("loadstart", onLoadStart);
      audio.removeEventListener("canplay", onCanPlay);
      audio.removeEventListener("progress", onProgress);
      audio.removeEventListener("stalled", onStalled);
      audio.removeEventListener("suspend", onSuspend);
    };
  }, [currentTrack?.id]);

  // Handle track change
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;

    if (songFetching) {
      return;
    }

    // If track changed, load new source
    if (currentTrack.id !== nowplaying) {
      setNowPlaying(currentTrack.id);
      trackIdRef.current = currentTrack.id;
      setLoading(true);
      setSongFetching(true);

      // Update media session metadata
      if ("mediaSession" in navigator) {
        try {
          navigator.mediaSession.metadata = new MediaMetadata({
            title: currentTrack.title || "Unknown",
            artist: currentTrack.artist || "Unknown Artist",
            album: currentTrack.album || "AraaMusic",
            artwork: [
              {
                src: currentTrack.cover || "",
                sizes: "96x96",
                type: "image/jpeg",
              },
              {
                src: currentTrack.cover || "",
                sizes: "192x192",
                type: "image/jpeg",
              },
              {
                src: currentTrack.cover || "",
                sizes: "512x512",
                type: "image/jpeg",
              },
              {
                src: currentTrack.cover || "",
                sizes: "1024x1024",
                type: "image/jpeg",
              },
            ],
          });
        } catch (err) {
          console.warn("Failed to set media session metadata:", err);
        }
      }

      // Check prefetch cache first — but only if the cached URL isn't
      // about to expire (signed CDN links included).
      const cached = prefetchCacheRef.current.get(currentTrack.id);
      const cachedAudios =
        cached?.data?.audios || cached?.data?.link?.audios || [];
      const cachedQualityIndex = pickQualityIndex(
        cachedAudios,
        settings.audioQuality,
      );
      const cachedChosen =
        cachedQualityIndex >= 0 ? cachedAudios[cachedQualityIndex] : null;

      if (
        cached &&
        !isCacheExpired(cached) &&
        cachedChosen?.url &&
        !isUrlExpired(cachedChosen.url)
      ) {
        applyCrossOriginForUrl(audio, cachedChosen.url);
        audio.src = cachedChosen.url;
        setCurrentTime(0);
        audio.load(); // Ensure metadata is loaded

        if (isPlaying) {
          // Wait for canplay before playing
          const playWhenReady = () => {
            audio.removeEventListener("canplay", playWhenReady);
            audio
              .play()
              .then(() => {})
              .catch((err) => {
                console.error("Play failed:", err.name, err.message);
                setIsPlaying(false);
              });
          };
          audio.addEventListener("canplay", playWhenReady);
        }

        setLoading(false);
        setSongFetching(false);
        return;
      }

      if (cached) {
        // Cache existed but was stale/expired — drop it so we fetch fresh.
        prefetchCacheRef.current.delete(currentTrack.id);
      }

      // Fetch from API (not in cache, or cache was stale)
      getAudioUrl(currentTrack.id)
        .then((entries) => {
          if (!entries) {
            throw new Error("No audio data received");
          }

          const audios = entries?.audios || entries?.link?.audios || [];

          if (!Array.isArray(audios) || audios.length === 0) {
            throw new Error("No audio sources available");
          }

          const qualityIndex = pickQualityIndex(audios, settings.audioQuality);
          const chosen = qualityIndex >= 0 ? audios[qualityIndex] : null;

          if (!chosen?.url) {
            throw new Error("No playable source found for selected quality");
          }

          // Cache the result
          prefetchCacheRef.current.set(
            currentTrack.id,
            createCacheEntry(entries),
          );

          applyCrossOriginForUrl(audio, chosen.url);
          audio.src = chosen.url;
          setCurrentTime(0);
          audio.load(); // Ensure metadata is loaded

          if (isPlaying) {
            // Wait for canplay before playing
            const playWhenReady = () => {
              audio.removeEventListener("canplay", playWhenReady);
              audio
                .play()
                .then(() => {})
                .catch((err) => {
                  console.error("Play failed:", err.name, err.message);
                  // Autoplay might be blocked - that's OK, user will click play
                  setIsPlaying(false);
                });
            };
            audio.addEventListener("canplay", playWhenReady);
          }

          setLoading(false);
          setSongFetching(false);
        })
        .catch((error) => {
          console.error("Failed to load track:", error.message);
          safeToast(`Failed: ${error.message || "Unknown error"}`);
          setLoading(false);
          setSongFetching(false);
          handleEnded();
        });
    }

    // Play/pause control - only when not fetching and audio source is set
    if (isPlaying && !songFetching && audio.src) {
      audio
        .play()
        .then(() => {})
        .catch((err) => {
          console.warn("Play command failed:", err.name, err.message);
          setIsPlaying(false);
        });
    } else if (!isPlaying) {
      audio.pause();
    }
  }, [
    currentTrack,
    isPlaying,
    songFetching,
    settings.audioQuality,
    getAudioUrl,
  ]);

  // Update volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = muted ? 0 : volume;
    }
  }, [volume, muted]);

  // Trigger prefetch at 5% progress
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack?.id) return;

    const duration = audio.duration || 0;
    if (!duration) return;

    const progress = currentTime / duration;

    if (
      progress >= 0.05 &&
      !prefetchTriggeredRef.current.has(currentTrack.id)
    ) {
      prefetchTriggeredRef.current.add(currentTrack.id);
      prefetchUpcoming(currentTrack.id, 3);
    }
  }, [currentTime, currentTrack?.id, prefetchUpcoming]);

  // Add to history
  async function pushHistory(track) {
    await api
      .post("/me/history", track)
      .then((entries) => {
        setHistory(entries);
        saveLocalHistory(entries);
      })
      .catch((error) => {
        console.error("Failed to save history:", error);
      });
  }

  // Play a track with optional list and optional batch metadata
  // (batchMeta: { playlistId, isCustom, hasMore } — enables paginated
  // loading of the rest of the playlist as playback progresses).
  function play(track, list, batchMeta) {
    if (!track?.id) {
      safeToast("Invalid track");
      console.error("Invalid track:", track);
      return;
    }

    const trackList = list && list.length ? list : [track];
    const idx = trackList.findIndex((t) => t.id === track.id);
    setQueue(trackList);
    setQueueIndex(idx === -1 ? 0 : idx);
    setQueueMeta(batchMeta && batchMeta.playlistId ? { ...batchMeta } : null);
    setIsPlaying(true);
    setLoading(true);
    setAudioState("loading");
    pushHistory(track);
  }

  const togglePlay = useCallback(() => {
    if (!audioRef.current || !currentTrack || songFetching) return;

    const audio = audioRef.current;

    if (audio.paused) {
      audio
        .play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch((err) => {
          console.error("Play failed:", err.name, err.message);
          setIsPlaying(false);
        });
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  }, [currentTrack, songFetching]);

  // Play at specific queue index
  function playAt(index) {
    if (index < 0 || index >= queue.length) return;
    setQueueIndex(index);
    setIsPlaying(true);
    setLoading(true);
    prefetchTriggeredRef.current.delete(queue[index]?.id);
    pushHistory(queue[index]);
  }

  const next = useCallback(() => {
    if (!queue.length) {
      console.warn("Queue is empty");
      return;
    }

    if (shuffle) {
      const idx = Math.floor(Math.random() * queue.length);
      playAt(idx);
      return;
    }

    const nextIdx = getNextIndex(queueIndex);
    if (nextIdx >= 0) {
      playAt(nextIdx);
    } else {
      setIsPlaying(false);
    }
  }, [queue.length, queueIndex, shuffle, getNextIndex]);

  const prev = useCallback(() => {
    if (!queue.length) {
      console.warn("Queue is empty");
      return;
    }

    // If more than 3 seconds in, restart current song
    if (currentTime > 3) {
      seek(0);
      return;
    }

    // Otherwise go to previous
    if (queueIndex > 0) {
      playAt(queueIndex - 1);
    } else {
      seek(0);
    }
  }, [queue.length, queueIndex, currentTime]);

  // Handle track end
  function handleEnded() {
    if (repeatMode === "one") {
      seek(0);
      audioRef.current?.play().catch(() => {
        console.error("Failed to replay");
      });
      return;
    }
    next();
  }

  // Seek to time
  function seek(time) {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(0, time);
      setCurrentTime(Math.max(0, time));
    }
  }

  // Set volume with validation
  function setVolume(v) {
    const validated = Math.min(1, Math.max(0, v));
    setVolumeState(validated);
    if (validated > 0) setMuted(false);
  }

  function toggleMute() {
    setMuted((m) => !m);
  }

  function toggleShuffle() {
    setShuffle((s) => !s);
  }

  function cycleRepeat() {
    setRepeatMode((m) => (m === "off" ? "all" : m === "all" ? "one" : "off"));
  }

  function addToQueue(track) {
    if (track?.id) {
      setQueue((prev) => [...prev, track]);
    }
  }

  function playNext(track) {
    if (!track?.id) return;
    setQueue((prev) => {
      const next = [...prev];
      next.splice(queueIndex + 1, 0, track);
      return next;
    });
  }

  // Media Session integration
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !("mediaSession" in navigator)) return;

    navigator.mediaSession.setActionHandler("play", () => togglePlay());
    navigator.mediaSession.setActionHandler("pause", () => togglePlay());
    navigator.mediaSession.setActionHandler("nexttrack", () => next());
    navigator.mediaSession.setActionHandler("previoustrack", () => prev());

    navigator.mediaSession.setActionHandler("seekbackward", (details) => {
      const offset = details?.seekOffset || 10;
      seek(Math.max(0, audio.currentTime - offset));
    });

    navigator.mediaSession.setActionHandler("seekforward", (details) => {
      const offset = details?.seekOffset || 10;
      seek(Math.min(audio.duration, audio.currentTime + offset));
    });

    navigator.mediaSession.setActionHandler("seekto", (details) => {
      if (details?.fastSeek && "fastSeek" in audio) {
        audio.fastSeek(details.seekTime);
      } else {
        seek(details?.seekTime || 0);
      }
    });

    const updatePositionState = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        navigator.mediaSession.setPositionState({
          duration: audio.duration,
          playbackRate: audio.playbackRate,
          position: audio.currentTime,
        });
      }
    };

    audio.addEventListener("timeupdate", updatePositionState);

    return () => {
      audio.removeEventListener("timeupdate", updatePositionState);
      navigator.mediaSession.setActionHandler("play", null);
      navigator.mediaSession.setActionHandler("pause", null);
      navigator.mediaSession.setActionHandler("nexttrack", null);
      navigator.mediaSession.setActionHandler("previoustrack", null);
      navigator.mediaSession.setActionHandler("seekbackward", null);
      navigator.mediaSession.setActionHandler("seekforward", null);
      navigator.mediaSession.setActionHandler("seekto", null);
    };
  }, [togglePlay, next, prev]);

  // Toggle like
  async function toggleLike(id, data) {
    if (!id) return;

    try {
      const response = likedIds.has(id)
        ? await api.delete(`/me/likes/${id}`)
        : await api.post(`/me/likes/${id}`, { data });
      console.log(Object.entries(response || {}).map(([key, val]) => val));
      const { likedSongs, ids = [] } = response;

      setLikedSongs(likedSongs || []);
      setLikedIds(new Set(ids));
    } catch (error) {
      console.error("Failed to update likes:", error);
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (fadeTimeoutRef.current) {
        clearInterval(fadeTimeoutRef.current);
      }
    };
  }, []);

  const value = useMemo(
    () => ({
      queue,
      queueIndex,
      queueMeta,
      currentTrack,
      isPlaying,
      currentTime,
      duration,
      volume,
      muted,
      shuffle,
      repeatMode,
      isFullPlayerOpen,
      isQueueOpen,
      likedIds,
      history,
      loading,
      songFetching,
      crossfadeDuration,
      bufferedDuration,
      networkError,
      audioState,
      autoplay: settings.autoplay,
      play,
      playAt,
      togglePlay,
      next,
      prev,
      seek,
      setVolume,
      toggleMute,
      toggleShuffle,
      cycleRepeat,
      addToQueue,
      playNext,
      toggleLike,
      isLiked: (id) => likedIds.has(id),
      setIsFullPlayerOpen,
      setIsQueueOpen,
      setCrossfadeDuration,
      applyCrossfade,
      likedSongs,
      setLikedSongs,
    }),
    [
      queue,
      queueIndex,
      queueMeta,
      currentTrack,
      isPlaying,
      currentTime,
      duration,
      volume,
      muted,
      shuffle,
      repeatMode,
      isFullPlayerOpen,
      isQueueOpen,
      likedIds,
      likedSongs,
      setLikedSongs,
      history,
      loading,
      songFetching,
      crossfadeDuration,
      bufferedDuration,
      networkError,
      audioState,
      settings.autoplay,
      togglePlay,
      next,
      prev,
      applyCrossfade,
    ],
  );
  
  return (
    <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>
  );
}

export function usePlayerContext() {
  const ctx = useContext(PlayerContext);
  if (!ctx) {
    throw new Error("usePlayerContext must be used within PlayerProvider");
  }
  return ctx;
}
