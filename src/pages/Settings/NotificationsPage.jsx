import React from "react";
import { Bell, ChevronLeft } from "lucide-react";
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

export default function NotificationsPage() {
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
            Notifications
          </h1>
          <p className="text-sm text-[var(--text-dim)]">
            Choose what AraaMusic can notify you about
          </p>
        </div>
      </div>

      {/* Notification Settings */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/50 p-5 sm:p-6 space-y-5">
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

        <div className="border-t border-[var(--border)] pt-5" />

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
      </div>

      {/* Info Card */}
      <div className="mt-6 rounded-2xl border border-[var(--border)]/50 bg-[var(--accent-a)]/5 p-4">
        <p className="text-sm text-[var(--text)]">
          🔔 Notifications require permission from your device. Grant access in your device settings to receive alerts.
        </p>
      </div>
    </div>
  );
}
