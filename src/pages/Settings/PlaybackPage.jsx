import React from "react";
import { PlayCircle, ChevronLeft } from "lucide-react";
import { useSettings } from "../../context/SettingsContext.jsx";
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

export default function PlaybackPage() {
  const { settings, update } = useSettings();
  const navigate = useNavigate();

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
            Playback
          </h1>
          <p className="text-sm text-[var(--text-dim)]">
            Fine-tune how music plays
          </p>
        </div>
      </div>

      {/* Playback Options */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/50 p-5 sm:p-6 space-y-5">
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

        <div className="border-t border-[var(--border)] pt-5" />

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

        <div className="border-t border-[var(--border)] pt-5" />

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
      </div>

      {/* Audio Quality */}
      <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)]/50 p-5 sm:p-6">
        <p className="text-sm font-semibold mb-4">Audio quality</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {["low", "normal", "high", "very high"].map((q) => (
            <button
              key={q}
              onClick={() => update({ audioQuality: q })}
              className={`rounded-lg border py-3 text-xs font-medium capitalize transition-colors ${
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

      {/* Crossfade */}
      <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)]/50 p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold">Crossfade</p>
          <span className="text-xs text-[var(--text-faint)] font-mono bg-[var(--surface)] px-2.5 py-1 rounded">
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
            background: `linear-gradient(to right, var(--accent-a) ${
              (settings.crossfade / 12) * 100
            }%, var(--border) ${(settings.crossfade / 12) * 100}%)`,
          }}
          className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-[var(--accent-a)]"
          aria-label="Crossfade duration"
        />
        <div className="flex justify-between text-xs text-[var(--text-dim)] mt-2">
          <span>0s</span>
          <span>12s</span>
        </div>
      </div>
    </div>
  );
}
