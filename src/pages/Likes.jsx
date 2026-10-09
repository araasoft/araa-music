import React from "react";
import { Heart, Play, Shuffle } from "lucide-react";
import { useAPI } from "../context/APIContext.jsx";
import { usePlayer } from "../hooks/usePlayer.js";
import { totalDuration } from "../utils/format.js";
import SongRow from "../components/music/SongRow.jsx";
import EmptyState from "../components/common/EmptyState.jsx";

export default function Likes() {
  const { songs } = useAPI();
  const { likedSongs, play, toggleShuffle, shuffle } = usePlayer();

  const liked = likedSongs;
  const duration = liked.reduce((sum, s) => sum + s.duration, 0);

  function handlePlay() {
    if (liked.length) play(liked[0], liked);
  }

  function handleShufflePlay() {
    if (!liked.length) return;
    if (!shuffle) toggleShuffle();
    const idx = Math.floor(Math.random() * liked.length);
    play(liked[idx], liked);
  }

  return (
    <div className="animate-slideUp">
      <div className="relative px-4 sm:px-6 pt-4 sm:pt-8 pb-6">
        <div className="aurora-glow opacity-40">
          <span />
          <span />
        </div>
        <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-end gap-5 sm:gap-6">
          <div className="w-40 h-40 sm:w-52 sm:h-52 rounded-2xl gradient-fill flex items-center justify-center shadow-2xl shrink-0">
            <Heart size={64} color="var(--on-accent)" fill="var(--on-accent)" />
          </div>
          <div className="text-center sm:text-left min-w-0">
            <p className="text-xs uppercase tracking-wider text-[var(--text-dim)] font-semibold mb-2">
              Playlist
            </p>
            <h1 className="font-display text-2xl sm:text-4xl font-bold mb-2">
              Liked Songs
            </h1>
            <p className="text-sm text-[var(--text-faint)]">
              {liked.length} songs
              {liked.length ? ` • ${totalDuration(duration)}` : ""}
            </p>
          </div>
        </div>
      </div>

      {liked.length === 0 ? (
        <EmptyState
          icon={Heart}
          title="Songs you like will appear here"
          description="Tap the heart icon on any song to save it to this playlist."
        />
      ) : (
        <>
          <div className="px-4 sm:px-6 flex items-center gap-3 mb-4">
            <button
              onClick={handlePlay}
              className="w-12 h-12 rounded-full gradient-fill flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-transform"
              aria-label="Play"
            >
              <Play
                size={20}
                color="var(--on-accent)"
                fill="var(--on-accent)"
                className="ml-0.5"
              />
            </button>
            <button
              onClick={handleShufflePlay}
              className={`w-11 h-11 rounded-full border flex items-center justify-center transition-colors ${
                shuffle
                  ? "text-[var(--accent-a)] border-[var(--accent-a)]"
                  : "border-[var(--border)] text-[var(--text-dim)] hover:text-[var(--text)]"
              }`}
              aria-label="Shuffle play"
            >
              <Shuffle size={17} />
            </button>
          </div>
          <div className="px-4 sm:px-6 pb-4">
            {liked.map((song, i) => (
              <SongRow
                key={song.id}
                song={song}
                index={i + 1}
                list={liked}
                showAlbum
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
