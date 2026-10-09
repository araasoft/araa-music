import React, { useRef } from "react";
import { Image as ImageIcon, ChevronLeft, Upload, Check } from "lucide-react";
import { useSettings, WALLPAPERS } from "../../context/SettingsContext.jsx";
import { showToast } from "../../utils/toast.js";
import { useNavigate } from "react-router-dom";
import Toggle from "../../components/common/Toggle.jsx";

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

export default function WallpaperPage() {
  const {
    settings,
    setWallpaper,
    setCustomWallpaper,
    update,
  } = useSettings();
  const fileRef = useRef(null);
  const navigate = useNavigate();

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

  return (
    <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-10 max-w-2xl animate-slideUp">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate("/settings")}
          className="p-2 rounded-lg hover:bg-[var(--surface)] transition-colors"
        >
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="font-display text-xl sm:text-2xl font-bold">
            Wallpaper
          </h1>
          <p className="text-sm text-[var(--text-dim)]">
            A soft backdrop behind the app, blurred and dimmed
          </p>
        </div>
      </div>

      {/* Wallpaper Grid */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold mb-3">Presets</h3>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
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
                      <Upload size={18} className="text-[var(--text-dim)]" />
                      <span className="text-[10px] text-[var(--text-dim)]">
                        Upload
                      </span>
                    </>
                  )}
                  {active && (
                    <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full gradient-fill flex items-center justify-center">
                      <Check
                        size={12}
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
                className={`relative aspect-square rounded-xl border-2 overflow-hidden transition-colors group ${
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
                <span className="absolute inset-0 flex items-center justify-center text-[10px] text-white opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                  {w.name}
                </span>
                {active && (
                  <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full gradient-fill flex items-center justify-center">
                    <Check size={12} color="var(--on-accent)" strokeWidth={3} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        className="hidden"
      />

      {/* Options */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/50 p-5 sm:p-6">
        <h3 className="text-sm font-semibold mb-4">Options</h3>
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
      </div>
    </div>
  );
}
