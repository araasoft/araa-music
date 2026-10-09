import React from "react";
import { Palette, ChevronLeft } from "lucide-react";
import { useSettings, THEMES } from "../../context/SettingsContext.jsx";
import { showToast } from "../../utils/toast.js";
import { useNavigate } from "react-router-dom";
import { Check } from "lucide-react";

export default function ThemePage() {
  const { settings, setTheme } = useSettings();
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
          <h1 className="font-display text-xl sm:text-2xl font-bold">Theme</h1>
          <p className="text-sm text-[var(--text-dim)]">
            Pick a color identity for the whole app
          </p>
        </div>
      </div>

      {/* Theme Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {THEMES.map((t) => {
          const active = settings.theme === t.id;
          return (
            <button
              key={t.id}
              onClick={() => {
                setTheme(t.id);
                showToast(`Theme set to ${t.name}`);
              }}
              className={`relative flex items-center gap-2.5 rounded-xl border p-4 text-left transition-colors group ${
                active
                  ? "border-[var(--accent-a)] bg-[var(--surface)]"
                  : "border-[var(--border)] hover:border-[var(--text-faint)]"
              }`}
            >
              <span
                className="w-10 h-10 rounded-full shrink-0"
                style={{
                  background: `linear-gradient(135deg, ${t.a}, ${t.b})`,
                }}
              />
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium block truncate">{t.name}</span>
                <span className="text-xs text-[var(--text-dim)]">{t.id}</span>
              </div>
              {active && (
                <span className="absolute top-3 right-3 w-5 h-5 rounded-full gradient-fill flex items-center justify-center">
                  <Check size={12} color="var(--on-accent)" strokeWidth={3} />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Preview */}
      <div className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--surface)]/50 p-6">
        <h3 className="text-sm font-semibold mb-3">Preview</h3>
        <div
          className="h-32 rounded-xl"
          style={{
            background: `linear-gradient(135deg, var(--accent-a), var(--accent-b))`,
          }}
        />
      </div>
    </div>
  );
}
