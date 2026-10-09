import React, { useRef, useState } from "react";
import {
  Palette,
  Image as ImageIcon,
  Fingerprint,
  PlayCircle,
  Bell,
  Globe,
  Check,
  Trash2,
  Info,
  Upload,
  Sparkles,
} from "lucide-react";
import {
  useSettings,
  THEMES,
  WALLPAPERS,
} from "../context/SettingsContext.jsx";
import Toggle from "../components/common/Toggle.jsx";
import { showToast } from "../utils/toast.js";

function SectionCard({ icon: Icon, title, description, children }) {
  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/50 p-5 sm:p-6 mb-5">
      <div className="flex items-start gap-3 mb-5">
        <div className="w-9 h-9 rounded-xl gradient-fill flex items-center justify-center shrink-0">
          <Icon size={17} color="var(--on-accent)" />
        </div>
        <div>
          <h2 className="font-display font-semibold text-base">{title}</h2>
          {description && (
            <p className="text-sm text-[var(--text-dim)] mt-0.5">
              {description}
            </p>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}

function Row({ label, hint, children }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {hint && (
          <p className="text-xs text-[var(--text-dim)] mt-0.5">{hint}</p>
        )}
      </div>
      {children}
    </div>
  );
}

export default function Settings() {
  const {
    installApp,
    installPrompt,
    isInstalled,
    canInstall,
    settings,
    setTheme,
    setWallpaper,
    setCustomWallpaper,
    setBiometricLock,
    update,
  } = useSettings();
  const fileRef = useRef(null);
  const [clearing, setClearing] = useState(false);

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showToast("Please choose an image file");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setCustomWallpaper(reader.result);
      showToast("Wallpaper updated");
    };
    reader.readAsDataURL(file);
  }

  function handleClearCache() {
    setClearing(true);
    setTimeout(() => {
      setClearing(false);
      showToast("Cache cleared");
    }, 700);
  }

  return (
    <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-10 max-w-2xl animate-slideUp">
      <h1 className="font-display text-xl sm:text-2xl font-bold mb-1">
        Settings
      </h1>
      <p className="text-sm text-[var(--text-dim)] mb-6">
        Make AraaMusic look and feel like yours.
      </p>

      {/* Appearance */}
      <SectionCard
        icon={Palette}
        title="Theme"
        description="Pick a color identity for the whole app"
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {THEMES.map((t) => {
            const active = settings.theme === t.id;
            return (
              <button
                key={t.id}
                onClick={() => {
                  setTheme(t.id);
                  showToast(`Theme set to ${t.name}`);
                }}
                className={`relative flex items-center gap-2.5 rounded-xl border p-3 text-left transition-colors ${
                  active
                    ? "border-[var(--accent-a)]"
                    : "border-[var(--border)] hover:border-[var(--text-faint)]"
                }`}
              >
                <span
                  className="w-8 h-8 rounded-full shrink-0"
                  style={{
                    background: `linear-gradient(135deg, ${t.a}, ${t.b})`,
                  }}
                />
                <span className="text-sm font-medium truncate">{t.name}</span>
                {active && (
                  <span className="absolute top-2 right-2 w-4 h-4 rounded-full gradient-fill flex items-center justify-center">
                    <Check size={10} color="var(--on-accent)" strokeWidth={3} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard
        icon={ImageIcon}
        title="Wallpaper"
        description="A soft backdrop behind the app, blurred and dimmed"
      >
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5">
          {WALLPAPERS.map((w) => {
            const active = settings.wallpaper === w.id;
            if (w.custom) {
              return (
                <button
                  key={w.id}
                  onClick={() => fileRef.current?.click()}
                  className={`relative aspect-square rounded-xl border-2 flex flex-col items-center justify-center gap-1 transition-colors overflow-hidden ${
                    active
                      ? "border-[var(--accent-a)]"
                      : "border-[var(--border)] hover:border-[var(--text-faint)]"
                  }`}
                  style={
                    active && settings.customWallpaper
                      ? {
                          backgroundImage: `url(${settings.customWallpaper})`,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                        }
                      : undefined
                  }
                >
                  {!(active && settings.customWallpaper) && (
                    <>
                      <Upload size={16} className="text-[var(--text-dim)]" />
                      <span className="text-[10px] text-[var(--text-dim)]">
                        Upload
                      </span>
                    </>
                  )}
                  {active && (
                    <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full gradient-fill flex items-center justify-center">
                      <Check
                        size={10}
                        color="var(--on-accent)"
                        strokeWidth={3}
                      />
                    </span>
                  )}
                </button>
              );
            }
            return (
              <button
                key={w.id}
                onClick={() => {
                  setWallpaper(w.id);
                  showToast(`Wallpaper set to ${w.name}`);
                }}
                className={`relative aspect-square rounded-xl border-2 overflow-hidden transition-colors ${
                  active
                    ? "border-[var(--accent-a)]"
                    : "border-[var(--border)] hover:border-[var(--text-faint)]"
                }`}
                style={{ background: w.style || "var(--surface)" }}
              >
                {w.id === "none" && (
                  <span className="absolute inset-0 flex items-center justify-center text-[10px] text-[var(--text-dim)]">
                    None
                  </span>
                )}
                {active && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full gradient-fill flex items-center justify-center">
                    <Check size={10} color="var(--on-accent)" strokeWidth={3} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={handleFile}
          className="hidden"
        />

        <Row
          label="Reduce motion"
          hint="Turns off ambient glow animation and transitions"
        >
          <Toggle
            checked={settings.reduceMotion}
            onChange={(v) => update({ reduceMotion: v })}
            label="Reduce motion"
          />
        </Row>
      </SectionCard>

      {/* Security */}
      <SectionCard
        icon={Fingerprint}
        title="Security"
        description="Protect AraaMusic when you're away"
      >
        <Row
          label="App lock (biometric)"
          hint="Require Face ID / fingerprint to open the app"
        >
          <Toggle
            checked={settings.biometricLock}
            onChange={(v) => {
              setBiometricLock(v);
              showToast(v ? "App lock enabled" : "App lock disabled");
            }}
            label="App lock"
          />
        </Row>
      </SectionCard>

      {/* Playback */}
      <SectionCard
        icon={PlayCircle}
        title="Playback"
        description="Fine-tune how music plays"
      >
        <Row
          label="Autoplay"
          hint="Keep playing similar songs when your queue ends"
        >
          <Toggle
            checked={settings.autoplay}
            onChange={(v) => update({ autoplay: v })}
            label="Autoplay"
          />
        </Row>
        <Row
          label="Gapless playback"
          hint="No silence between tracks on the same album"
        >
          <Toggle
            checked={settings.gapless}
            onChange={(v) => update({ gapless: v })}
            label="Gapless playback"
          />
        </Row>
        <Row
          label="Download over Wi-Fi only"
          hint="Avoid using mobile data for downloads"
        >
          <Toggle
            checked={settings.downloadWifiOnly}
            onChange={(v) => update({ downloadWifiOnly: v })}
            label="Wi-Fi only downloads"
          />
        </Row>

        <div>
          <p className="text-sm font-medium mb-2">Audio quality</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {["low", "normal", "high", "very high"].map((q) => (
              <button
                key={q}
                onClick={() => update({ audioQuality: q })}
                className={`rounded-lg border py-2 text-xs font-medium capitalize transition-colors ${
                  settings.audioQuality === q
                    ? "border-[var(--accent-a)] text-[var(--accent-a)] bg-[var(--accent-a)]/10"
                    : "border-[var(--border)] text-[var(--text-dim)] hover:text-[var(--text)]"
                }`}
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium">Crossfade</p>
            <span className="text-xs text-[var(--text-faint)] font-mono">
              {settings.crossfade}s
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={12}
            value={settings.crossfade}
            onChange={(e) => update({ crossfade: Number(e.target.value) })}
            style={{
              background: `linear-gradient(to right, var(--accent-a) ${(settings.crossfade / 12) * 100}%, var(--border) ${(settings.crossfade / 12) * 100}%)`,
            }}
            className="w-full"
            aria-label="Crossfade duration"
          />
        </div>
      </SectionCard>

      {/* Notifications */}
      <SectionCard
        icon={Bell}
        title="Notifications"
        description="Choose what AraaMusic can notify you about"
      >
        <Row
          label="New releases"
          hint="Get notified when artists you follow drop new music"
        >
          <Toggle
            checked={settings.notifyReleases}
            onChange={(v) => update({ notifyReleases: v })}
            label="New releases"
          />
        </Row>
        <Row
          label="Playlist updates"
          hint="Get notified when your followed playlists change"
        >
          <Toggle
            checked={settings.notifyPlaylists}
            onChange={(v) => update({ notifyPlaylists: v })}
            label="Playlist updates"
          />
        </Row>
      </SectionCard>

      {/* General */}
      <SectionCard icon={Globe} title="General">
        <div>
          <p className="text-sm font-medium mb-2">Language</p>
          <select
            value={settings.language}
            onChange={(e) => update({ language: e.target.value })}
            className="w-full rounded-lg bg-[var(--surface)] border border-[var(--border)] px-3.5 py-2.5 text-sm outline-none focus:border-[var(--accent-a)] transition-colors"
          >
            <option value="en">English</option>
            <option value="hi">Hindi</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
            <option value="de">German</option>
            <option value="ja">Japanese</option>
          </select>
        </div>

        <Row
          label="Clear cache"
          hint="Frees up storage used for downloaded and cached audio"
        >
          <button
            onClick={handleClearCache}
            disabled={clearing}
            className="flex items-center gap-1.5 rounded-full border border-[var(--border)] px-3.5 py-2 text-xs font-medium hover:border-[var(--danger)] hover:text-[var(--danger)] transition-colors disabled:opacity-50"
          >
            <Trash2 size={13} /> {clearing ? "Clearing…" : "Clear"}
          </button>
        </Row>

        <Row
          label="install app"
          hint={
            isInstalled
              ? `App is installed. To remove it, uninstall it from your device's
     home screen or app list, like any other app.`
              : canInstall
                ? ""
                : `Install isn't available in this browser yet, try opening in
     Chrome/Edge on Android, or use "Add to Home Screen" on iOS Safari.`
          }
        >
          <button
            disabled={!canInstall}
            onClick={installApp}
            className="flex items-center gap-1.5 rounded-full border border-[var(--border)] px-3.5 py-2 text-xs font-medium hover:border-[var(--danger)] hover:text-[var(--danger)] transition-colors disabled:opacity-50"
          >
            {isInstalled ? `Intsalled` : canInstall ? `Install` : ``}
          </button>
        </Row>
      </SectionCard>

      <div className="flex items-center gap-2 text-xs text-[var(--text-faint)] justify-center mt-2">
        <Sparkles size={12} />
        <span>AraaMusic v1.0.0 — made with care</span>
      </div>
    </div>
  );
}
