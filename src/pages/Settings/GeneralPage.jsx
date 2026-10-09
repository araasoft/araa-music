import React, { useState } from "react";
import { Globe, ChevronLeft, Trash2, Sparkles } from "lucide-react";
import { useSettings } from "../../context/SettingsContext.jsx";
import { useNavigate } from "react-router-dom";
import { showToast } from "../../utils/toast.js";
import { useStorageCheck } from "../../hooks/useStorageCheck";
import { useMusicDownload } from "../../hooks/useMusicDownload";

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

export default function GeneralPage() {
  const { settings, update } = useSettings();
  const { storageInfo, checkStorage } = useStorageCheck();
  const { downloadMusic, downloading } = useMusicDownload();

  const navigate = useNavigate();
  const [clearing, setClearing] = useState(false);

  function handleClearCache() {
    setClearing(true);
    setTimeout(() => {
      setClearing(false);
      showToast("Cache cleared");
    }, 700);
  }

  function formatBytes(bytes) {
    if (bytes === 0) return "0 Bytes";

    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  }

  return (
    <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-10 max-w-2xl animate-slideUp">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg hover:bg-[var(--surface)] transition-colors"
        >
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="font-display text-xl sm:text-2xl font-bold">
            General
          </h1>
          <p className="text-sm text-[var(--text-dim)]">
            Language and storage settings
          </p>
        </div>
      </div>

      {/* Language */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/50 p-5 sm:p-6 mb-6">
        <p className="text-sm font-semibold mb-4">Language</p>
        <select
          value={settings.language}
          onChange={(e) => update({ language: e.target.value })}
          className="w-full rounded-lg bg-[var(--surface)] border border-[var(--border)] px-4 py-3 text-sm outline-none focus:border-[var(--accent-a)] transition-colors cursor-pointer"
        >
          <option value="en">English</option>
          <option value="hi">Hindi</option>
          <option value="es">Spanish</option>
          <option value="fr">French</option>
          <option value="de">German</option>
          <option value="ja">Japanese</option>
        </select>
      </div>

      {/* Storage */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/50 p-5 sm:p-6 mb-6">
        <div className="mb-5">
          <p className="text-sm font-semibold mb-2">Storage</p>
          <p className="text-xs text-[var(--text-dim)] mb-4">
            Used: {formatBytes(storageInfo.usage)} / Available:{" "}
            {formatBytes(storageInfo.quota)}
          </p>
          <div className="w-full bg-[var(--border)] rounded-full h-2 overflow-hidden">
            <div
              className="h-full gradient-fill"
              style={{
                width: `${(storageInfo.usage / storageInfo.quota) * 100}%`,
              }}
            />
          </div>
        </div>

        <Row
          label="Clear cache"
          hint="Frees up storage used for downloaded and cached audio"
        >
          <button
            onClick={handleClearCache}
            disabled={clearing}
            className="flex items-center gap-2 rounded-full border border-[var(--border)] px-4 py-2 text-xs font-medium hover:border-[var(--danger)] hover:text-[var(--danger)] transition-colors disabled:opacity-50"
          >
            <Trash2 size={14} /> {clearing ? "Clearing…" : "Clear"}
          </button>
        </Row>
      </div>

      {/* About */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/50 p-5 sm:p-6">
        <p className="text-sm font-semibold mb-4">About</p>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--text-dim)]">App version</span>
            <span className="text-sm font-mono font-semibold">v1.0.0</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--text-dim)]">Build</span>
            <span className="text-sm font-mono">2026.09.01</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--text-dim)]">Last updated</span>
            <span className="text-sm font-mono">Sep 9, 2026</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center gap-2 text-xs text-[var(--text-faint)] justify-center mt-8">
        <Sparkles size={12} />
        <span>AraaMusic — made with care</span>
      </div>
    </div>
  );
}
