import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAuth } from "../hooks/useAuth.js";
import { api } from "../lib/api.js";

const STORAGE_KEY = "araamusic.settings.v1";

export const THEMES = [
  {
    id: "aurora",
    name: "Aurora Violet",
    a: "#a463ff",
    b: "#ff6fc7",
    dark: true,
  },
  { id: "teal", name: "Midnight Teal", a: "#28d3c5", b: "#3fa9f5", dark: true },
  { id: "ember", name: "Sunset Ember", a: "#ff8a4c", b: "#ff4d6d", dark: true },
  { id: "rose", name: "Rose Quartz", a: "#ff6fa5", b: "#c893ff", dark: true },
  { id: "ocean", name: "Ocean Breeze", a: "#3fb0ff", b: "#3ff0c7", dark: true },
  { id: "daylight", name: "Daylight", a: "#7c4dff", b: "#ff5fa8", dark: false },
];

export const WALLPAPERS = [
  { id: "none", name: "None", style: null },
  {
    id: "aurora",
    name: "Aurora Haze",
    style:
      "radial-gradient(circle at 20% 20%, var(--accent-a), transparent 45%), radial-gradient(circle at 80% 70%, var(--accent-b), transparent 45%), var(--bg)",
  },
  {
    id: "mesh",
    name: "Mesh Glow",
    style:
      "conic-gradient(from 180deg at 50% 50%, var(--accent-a), var(--accent-b), var(--accent-a))",
  },
  {
    id: "dusk",
    name: "Dusk Fade",
    style: "linear-gradient(160deg, var(--accent-a) 0%, var(--bg) 55%)",
  },
  { id: "custom", name: "Custom image", style: null, custom: true },
];

const defaults = {
  theme: "aurora",
  wallpaper: "aurora",
  customWallpaper: null,
  reduceMotion: false,
  biometricLock: false,
  autoplay: true,
  gapless: true,
  crossfade: 0,
  audioQuality: "high",
  downloadWifiOnly: true,
  notifyReleases: true,
  notifyPlaylists: false,
  language: "en",
};

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    return { ...defaults, ...JSON.parse(raw) };
  } catch {
    return defaults;
  }
}

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [settings, setSettings] = useState(load);
  const hydrated = useRef(false);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(() => checkStandalone());

  function checkStandalone() {
    return (
      window.matchMedia?.("(display-mode: standalone)").matches ||
      window.navigator.standalone === true // iOS Safari
    );
  }

  // Always keep a local copy so the app works instantly and offline.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // storage unavailable — settings stay in-memory for this session
    }
  }, [settings]);

  // Once signed in, pull any settings saved on the backend and merge them in.
  useEffect(() => {
    if (!isAuthenticated) {
      hydrated.current = false;
      return;
    }
    let cancelled = false;
    api
      .get("/me/settings")
      .then((remote) => {
        if (!cancelled && remote)
          setSettings((prev) => ({ ...prev, ...remote }));
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) hydrated.current = true;
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", settings.theme);
  }, [settings.theme]);

  useEffect(() => {
    document.documentElement.classList.toggle(
      "reduce-motion",
      settings.reduceMotion,
    );
  }, [settings.reduceMotion]);

  const update = (patch) => {
    setSettings((prev) => ({ ...prev, ...patch }));
    if (isAuthenticated) {
      api.put("/me/settings", patch).catch(() => {});
    }
  };

  useEffect(() => {
    const onBeforeInstall = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };
    const onInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
    };
    const mq = window.matchMedia("(display-mode: standalone)");
    const onDisplayModeChange = (e) => setIsInstalled(e.matches);

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    mq.addEventListener?.("change", onDisplayModeChange);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
      mq.removeEventListener?.("change", onDisplayModeChange);
    };
  }, []);

  const installApp = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const result = await installPrompt.userChoice;
    if (result.outcome === "accepted") setIsInstalled(true);
    setInstallPrompt(null);
  };

  const value = useMemo(
    () => ({
      settings,
      installApp,
      installPrompt,
      isInstalled,
      canInstall: !!installPrompt && !isInstalled,
      update,
      setTheme: (theme) => update({ theme }),
      setWallpaper: (wallpaper) => update({ wallpaper }),
      setCustomWallpaper: (dataUrl) =>
        update({ wallpaper: "custom", customWallpaper: dataUrl }),
      setBiometricLock: (biometricLock) => update({ biometricLock }),
    }),
    [settings, isAuthenticated],
  );

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}
