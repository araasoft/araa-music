import { useEffect, useRef, useState } from "react";
import { unlockWithBiometric } from "../../lib/webauthn.js";
import { useSettings } from "../../context/SettingsContext.jsx";

const AUTO_LOCK_SECONDS = 60;
const RING_RADIUS = 54;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export default function LockScreen({ onUnlock, isLocked = true }) {
  // Biometric + motion preference come from SettingsContext — the app's
  // single source of truth — instead of a separate localStorage key that
  // could drift out of sync with it.
  const { settings } = useSettings();
  const biometricEnabled = settings.biometricLock;
  const reduceMotion = settings.reduceMotion;

  const [loading, setLoading] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(AUTO_LOCK_SECONDS);
  const [error, setError] = useState(null);
  const timerRef = useRef(null);

  const handleAutoLock = () => {
    setError(null);
    if (window.cordova) {
      navigator.app.exitApp();
    } else if (window.electron) {
      window.electron.ipcRenderer.send("app:quit");
    } else {
      window.location.href = "/login";
    }
  };

  useEffect(() => {
    if (!isLocked) return undefined;
    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          handleAutoLock();
          return AUTO_LOCK_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLocked]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        clearInterval(timerRef.current);
      } else {
        setTimeRemaining(AUTO_LOCK_SECONDS);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  const handleUnlock = async () => {
    if (!biometricEnabled) {
      setError("Biometric lock isn't turned on");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (!window.PublicKeyCredential) {
        throw new Error("This device doesn't support biometric unlock");
      }
      const available =
        await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      if (!available) {
        throw new Error("Device authentication isn't available");
      }
      const result = await unlockWithBiometric();
      if (result) {
        clearInterval(timerRef.current);
        setTimeRemaining(AUTO_LOCK_SECONDS);
        onUnlock?.();
      }
    } catch (err) {
      setError(err.message || "Couldn't unlock — try again");
    } finally {
      setLoading(false);
    }
  };

  if (!isLocked) return null;

  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  const displayTime = `${minutes}:${seconds.toString().padStart(2, "0")}`;
  const isCritical = timeRemaining <= 15;
  const ringOffset =
    RING_CIRCUMFERENCE * (1 - timeRemaining / AUTO_LOCK_SECONDS);

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-[var(--bg)]/95 px-6 backdrop-blur-xl">
      {/* Ambient aurora glow, built entirely from the theme's accent vars */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden opacity-70"
      >
        <div
          className={`absolute -left-20 -top-24 h-72 w-72 rounded-full blur-3xl ${
            reduceMotion ? "" : "animate-pulse"
          }`}
          style={{ background: "var(--accent-a)", opacity: 0.35 }}
        />
        <div
          className={`absolute -bottom-24 -right-16 h-80 w-80 rounded-full blur-3xl ${
            reduceMotion ? "" : "animate-pulse"
          }`}
          style={{ background: "var(--accent-b)", opacity: 0.3 }}
        />
      </div>

      <div className="relative w-full max-w-[360px] rounded-[28px] border border-[var(--border)] bg-[var(--surface)]/95 px-7 py-9 text-center shadow-[0_30px_80px_-30px_rgba(0,0,0,0.6)] backdrop-blur-md">
        <p className="text-sm font-medium tracking-tight text-[var(--text-dim)]">
          AraaMusic
        </p>
        <p className="mt-1 text-lg font-semibold text-[var(--text)]">
          App locked
        </p>

        <div className="relative mx-auto mt-8 h-32 w-32">
          <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
            <defs>
              <linearGradient id="lockRingGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{ stopColor: "var(--accent-a)" }} />
                <stop offset="100%" style={{ stopColor: "var(--accent-b)" }} />
              </linearGradient>
            </defs>
            <circle
              cx="60"
              cy="60"
              r={RING_RADIUS}
              fill="none"
              stroke="var(--border)"
              strokeWidth="4"
            />
            <circle
              cx="60"
              cy="60"
              r={RING_RADIUS}
              fill="none"
              stroke={isCritical ? "var(--danger)" : "url(#lockRingGradient)"}
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={RING_CIRCUMFERENCE}
              strokeDashoffset={ringOffset}
              className={
                reduceMotion ? "" : "transition-[stroke-dashoffset] duration-1000 ease-linear"
              }
            />
          </svg>

          <button
            type="button"
            onClick={handleUnlock}
            disabled={loading || !biometricEnabled}
            aria-label={
              biometricEnabled
                ? "Unlock with biometrics"
                : "Biometric lock isn't turned on"
            }
            className={`absolute inset-[10px] flex items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg-elev)] text-[var(--text)] transition-colors enabled:hover:bg-[var(--surface-hover)] disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-a)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-elev)] ${
              !reduceMotion && biometricEnabled && !loading ? "animate-pulse" : ""
            }`}
          >
            {loading ? (
              <span
                className={`h-6 w-6 rounded-full border-2 border-[var(--text-faint)] border-t-[var(--accent-a)] ${
                  reduceMotion ? "" : "animate-spin"
                }`}
              />
            ) : (
              <FingerprintIcon locked={!biometricEnabled} />
            )}
          </button>
        </div>

        <div aria-live="polite" className="mt-6 min-h-[1.25rem] text-sm">
          {biometricEnabled ? (
            <p className="text-[var(--text-dim)]">
              {loading ? "Verifying…" : "Tap to unlock"}
            </p>
          ) : (
            <p className="text-[var(--text-dim)]">
              Turn on biometric lock to unlock with a tap
            </p>
          )}
          {error && <p className="mt-1 text-[var(--danger)]">{error}</p>}
        </div>

        {!biometricEnabled && (
          <button
            type="button"
            onClick={() => {
              window.location.href = "/settings";
            }}
            className="mt-5 w-full rounded-full px-5 py-2.5 text-sm font-medium text-[var(--on-accent)] transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-a)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]"
            style={{
              background: "linear-gradient(135deg, var(--accent-a), var(--accent-b))",
            }}
          >
            Set up biometric lock
          </button>
        )}

        <div className="mt-8 border-t border-[var(--border)] pt-5">
          <p className="text-xs text-[var(--text-faint)]">
            Locks for good in{" "}
            <span
              className={
                isCritical
                  ? "font-semibold text-[var(--danger)]"
                  : "font-medium text-[var(--text-dim)]"
              }
            >
              {displayTime}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

function FingerprintIcon({ locked }) {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="fpGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: "var(--accent-a)" }} />
          <stop offset="100%" style={{ stopColor: "var(--accent-b)" }} />
        </linearGradient>
      </defs>
      <path
        d="M12 3a7 7 0 0 0-7 7v2a5 5 0 0 0 1.5 3.6M17.5 15.6A5 5 0 0 0 19 12v-2a7 7 0 0 0-3.4-6M12 7a5 5 0 0 0-5 5v1.5M15.8 17.8A5 5 0 0 0 17 12M9 12a3 3 0 0 1 6 0v2c0 2-1 3.4-2.2 4.4M12 15v2.5"
        stroke={locked ? "var(--text-faint)" : "url(#fpGradient)"}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
