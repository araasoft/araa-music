import { useState, useEffect, useRef } from "react";
import { useSettings } from "../context/SettingsContext.jsx";

let listeners = [];
let idCounter = 0;

export function subscribeToast(fn) {
  listeners.push(fn);
  return () => {
    listeners = listeners.filter((l) => l !== fn);
  };
}

export function showToast(message) {
  const toast = { id: ++idCounter, message };
  listeners.forEach((fn) => fn(toast));
  return toast.id;
}




/**
 * Two-step verification flow
 * Steps: start -> confirm -> email -> otp -> success
 *                                              \-> error (unauthorized / too many attempts)
 *
 * Swap `mockSendOtp` / `mockVerifyOtp` for your real `useSettings()` calls
 * (e.g. enableTwoStepVerification) when wiring this into the app — the
 * step machine, animations and layout don't need to change.
 */

const STEP = {
  START: "start",
  CONFIRM: "confirm",
  EMAIL: "email",
  OTP: "otp",
  SUCCESS: "success",
  ERROR: "error",
};

const SEQUENCE = [STEP.START, STEP.CONFIRM, STEP.EMAIL, STEP.OTP];

const THEME = {
  "--bg-elev": "#15151f",
  "--surface": "#1d1d29",
  "--surface-hover": "#262633",
  "--border": "#2c2c3a",
  "--text": "#f2f2f6",
  "--text-dim": "#9696a8",
  "--accent-a": "#7c5cff",
  "--accent-b": "#36d1c4",
  "--on-accent": "#0c0c14",
  "--danger": "#ff5470",
  "--success": "#3ddc84",
};

const OTP_LENGTH = 6;
const DEMO_CODE = "123456";
const MAX_ATTEMPTS = 3;

function maskEmail(email) {
  const [name, domain] = email.split("@");
  if (!domain) return email;
  const visible = name.slice(0, 2);
  return `${visible}${"•".repeat(Math.max(name.length - 2, 3))}@${domain}`;
}

export function OtpModal({
  open = true,
  onClose,
  destination = "you@araamusic.com",
  onEnabled,
  length = OTP_LENGTH,
}) {
  const [step, setStep] = useState(STEP.START);
  const [digits, setDigits] = useState(Array(length).fill(""));
  const [pulses, setPulses] = useState({});
  const [shakeKey, setShakeKey] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [errorReason, setErrorReason] = useState("");
  const inputRefs = useRef([]);

  useEffect(() => {
    if (open) {
      setStep(STEP.START);
      setDigits(Array(length).fill(""));
      setError("");
      setAttempts(0);
      setPulses({});
      setLoading(false);
    }
  }, [open, length]);

  useEffect(() => {
    if (step === STEP.OTP) {
      const t = setTimeout(() => inputRefs.current[0]?.focus(), 60);
      return () => clearTimeout(t);
    }
  }, [step]);

  if (!open) return null;

  function triggerPulse(indices) {
    const next = {};
    indices.forEach((idx, order) => (next[idx] = order * 70));
    setPulses(next);
  }

  function clearPulse(i) {
    setPulses((p) => {
      if (!(i in p)) return p;
      const next = { ...p };
      delete next[i];
      return next;
    });
  }

  function triggerShake() {
    setShakeKey((k) => k + 1);
  }

  function handleChange(i, value) {
    const v = value.replace(/[^0-9]/g, "").slice(-1);
    const next = [...digits];
    next[i] = v;
    setDigits(next);
    setError("");
    if (v) {
      triggerPulse([i]);
      if (i < length - 1) inputRefs.current[i + 1]?.focus();
      else inputRefs.current[i]?.blur();
    }
  }

  function handleKeyDown(i, e) {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      inputRefs.current[i - 1]?.focus();
    }
  }

  function handlePaste(e) {
    const text = e.clipboardData.getData("text").replace(/[^0-9]/g, "");
    if (!text) return;
    e.preventDefault();
    const next = Array(length).fill("");
    const filled = [];
    for (let i = 0; i < Math.min(length, text.length); i++) {
      next[i] = text[i];
      filled.push(i);
    }
    setDigits(next);
    setError("");
    triggerPulse(filled);
    const lastFilled = Math.min(length, text.length) - 1;
    inputRefs.current[lastFilled >= 0 ? lastFilled : 0]?.focus();
  }

  async function mockSendOtp() {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 850));
    setLoading(false);
    setDigits(Array(length).fill(""));
    setError("");
    setStep(STEP.OTP);
  }

  async function mockVerifyOtp() {
    const code = digits.join("");
    if (code.length < length) {
      setError(`Enter all ${length} digits`);
      triggerShake();
      return;
    }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 650));
    setLoading(false);

    if (code === DEMO_CODE) {
      setError("");
      setStep(STEP.SUCCESS);
      onEnabled?.();
    } else {
      const nextAttempts = attempts + 1;
      setAttempts(nextAttempts);
      setDigits(Array(length).fill(""));
      triggerShake();
      if (nextAttempts >= MAX_ATTEMPTS) {
        setErrorReason(
          "Too many incorrect attempts. For your security, we've blocked this request."
        );
        setStep(STEP.ERROR);
      } else {
        setError(
          `Incorrect code. ${MAX_ATTEMPTS - nextAttempts} attempt${
            MAX_ATTEMPTS - nextAttempts === 1 ? "" : "s"
          } left.`
        );
        setTimeout(() => inputRefs.current[0]?.focus(), 60);
      }
    }
  }

  function handleClose() {
    if (loading) return;
    onClose?.();
  }

  const code = digits.join("");
  const isComplete = code.length === length;
  const seqIndex = SEQUENCE.indexOf(step);

  return (
    <div
      data-theme="aurora"
      className="fixed inset-0 z-[999] flex items-center justify-center px-5 h-[100dvh] w-[100%] overflow-hidden"
      style={{ background: "rgba(0,0,0,0.55)" }}
      onClick={handleClose}
    >
      <style>{`
        @keyframes otpFillPulse {
          0% { transform: scale(1); border-color: var(--border); box-shadow: none; }
          45% { transform: scale(1.16); border-color: var(--accent-a); box-shadow: 0 0 0 4px rgba(124,92,255,0.22); }
          100% { transform: scale(1); border-color: var(--accent-a); box-shadow: none; }
        }
        @keyframes otpShake {
          10%, 90% { transform: translateX(-2px); }
          20%, 80% { transform: translateX(4px); }
          30%, 50%, 70% { transform: translateX(-7px); }
          40%, 60% { transform: translateX(7px); }
        }
        @keyframes otpCardIn {
          0% { opacity: 0; transform: translateY(10px) scale(0.97); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes otpCheckDraw {
          to { stroke-dashoffset: 0; }
        }
        @keyframes otpCheckPop {
          0% { transform: scale(0.7); opacity: 0; }
          60% { transform: scale(1.08); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        .otp-card { animation: otpCardIn 260ms cubic-bezier(.2,.7,.3,1) both; }
        .otp-pulse { animation: otpFillPulse 340ms ease both; }
        .otp-shake { animation: otpShake 420ms ease; }
        .otp-input-success { border-color: transparent !important; background: rgba(61,220,132,0.14) !important; color: var(--success) !important; }
        .otp-check-circle { stroke-dasharray: 76; stroke-dashoffset: 76; animation: otpCheckDraw 500ms ease-out 150ms forwards; }
        .otp-check-tick { stroke-dasharray: 24; stroke-dashoffset: 24; animation: otpCheckDraw 300ms ease-out 550ms forwards; }
        .otp-check-wrap { animation: otpCheckPop 400ms ease both; }
      `}</style>

      <div
        key={step}
        className="otp-card w-full max-w-sm rounded-2xl border p-6 shadow-2xl"
        style={{
          ...THEME,
          background: "var(--bg-elev)",
          borderColor: "var(--border)",
          color: "var(--text)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* step progress dots — only during the setup sequence */}
        {seqIndex !== -1 && (
          <div className="flex items-center gap-1.5 mb-5">
            {SEQUENCE.map((s, i) => (
              <div
                key={s}
                className="h-1 flex-1 rounded-full transition-colors duration-300"
                style={{
                  background:
                    i <= seqIndex ? "var(--accent-a)" : "var(--border)",
                }}
              />
            ))}
          </div>
        )}

        {step === STEP.START && (
          <>
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center mb-4"
              style={{ background: "rgba(124,92,255,0.14)" }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 2 4 5v6c0 5 3.4 9 8 11 4.6-2 8-6 8-11V5l-8-3Z"
                  stroke="var(--accent-a)"
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h2 className="text-lg font-medium mb-1">
              Turn on two-step verification
            </h2>
            <p className="text-sm mb-6" style={{ color: "var(--text-dim)" }}>
              Add an extra layer of security. You'll enter a code from your
              email each time you sign in on a new device.
            </p>
            <button
              onClick={() => setStep(STEP.CONFIRM)}
              className="w-full rounded-xl py-2.5 font-medium transition"
              style={{
                background:
                  "linear-gradient(90deg, var(--accent-a), var(--accent-b))",
                color: "var(--on-accent)",
              }}
            >
              Get started
            </button>
            <button
              onClick={handleClose}
              className="w-full mt-2 rounded-xl py-2.5 font-medium border transition"
              style={{
                borderColor: "var(--border)",
                color: "var(--text-dim)",
                background: "transparent",
              }}
            >
              Not now
            </button>
          </>
        )}

        {step === STEP.CONFIRM && (
          <>
            <h2 className="text-lg font-medium mb-1">Before you continue</h2>
            <p className="text-sm mb-6" style={{ color: "var(--text-dim)" }}>
              Once enabled, you can't turn this off again without verifying
              by email or OTP. If you ever get stuck, contact araamusic
              support.
            </p>
            <button
              onClick={() => setStep(STEP.EMAIL)}
              className="w-full rounded-xl py-2.5 font-medium transition"
              style={{
                background:
                  "linear-gradient(90deg, var(--accent-a), var(--accent-b))",
                color: "var(--on-accent)",
              }}
            >
              Yes, continue
            </button>
            <button
              onClick={() => setStep(STEP.START)}
              className="w-full mt-2 rounded-xl py-2.5 font-medium border transition"
              style={{
                borderColor: "var(--border)",
                color: "var(--text-dim)",
                background: "transparent",
              }}
            >
              Go back
            </button>
          </>
        )}

        {step === STEP.EMAIL && (
          <>
            <h2 className="text-lg font-medium mb-1">Verify your email</h2>
            <p className="text-sm mb-1" style={{ color: "var(--text-dim)" }}>
              We'll send a {length}-digit code to
            </p>
            <p
              className="text-sm font-medium mb-6"
              style={{ color: "var(--text)" }}
            >
              {maskEmail(destination)}
            </p>
            <button
              onClick={mockSendOtp}
              disabled={loading}
              className="w-full rounded-xl py-2.5 font-medium transition disabled:opacity-60"
              style={{
                background:
                  "linear-gradient(90deg, var(--accent-a), var(--accent-b))",
                color: "var(--on-accent)",
              }}
            >
              {loading ? "Sending..." : "Send code"}
            </button>
            <button
              onClick={() => setStep(STEP.CONFIRM)}
              disabled={loading}
              className="w-full mt-2 rounded-xl py-2.5 font-medium border transition"
              style={{
                borderColor: "var(--border)",
                color: "var(--text-dim)",
                background: "transparent",
              }}
            >
              Go back
            </button>
          </>
        )}

        {step === STEP.OTP && (
          <>
            <h2 className="text-lg font-medium mb-1">
              Enter verification code
            </h2>
            <p className="text-sm mb-5" style={{ color: "var(--text-dim)" }}>
              We sent a {length}-digit code to {maskEmail(destination)}.{" "}
              <span style={{ opacity: 0.6 }}>(Demo code: {DEMO_CODE})</span>
            </p>

            <div
              key={shakeKey}
              className={`flex justify-center gap-2 mb-2 ${
                error ? "otp-shake" : ""
              }`}
              onPaste={handlePaste}
            >
              {digits.map((d, i) => {
                const pulseDelay = pulses[i];
                const showSuccess = loading === false && step === STEP.OTP && false; // reserved
                return (
                  <input
                    key={i}
                    ref={(el) => (inputRefs.current[i] = el)}
                    value={d}
                    disabled={loading}
                    onChange={(e) => handleChange(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    onAnimationEnd={() => clearPulse(i)}
                    inputMode="numeric"
                    maxLength={1}
                    className={`w-10 h-12 text-center text-xl rounded-xl border-2 outline-none transition-all duration-150 ${
                      pulseDelay !== undefined ? "otp-pulse" : ""
                    }`}
                    style={{
                      animationDelay:
                        pulseDelay !== undefined ? `${pulseDelay}ms` : undefined,
                      background: "var(--surface)",
                      borderColor: error
                        ? "var(--danger)"
                        : isComplete
                        ? "var(--accent-b)"
                        : "var(--border)",
                      color: error ? "var(--danger)" : "var(--text)",
                      opacity: loading ? 0.6 : 1,
                    }}
                    onFocus={(e) => {
                      if (!error) e.target.style.borderColor = "var(--accent-a)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = error
                        ? "var(--danger)"
                        : isComplete
                        ? "var(--accent-b)"
                        : "var(--border)";
                    }}
                  />
                );
              })}
            </div>

            <div className="h-4 mb-2">
              {error && (
                <p className="text-xs" style={{ color: "var(--danger)" }}>
                  {error}
                </p>
              )}
            </div>

            <button
              onClick={mockVerifyOtp}
              disabled={loading}
              className="w-full rounded-xl py-2.5 font-medium transition disabled:opacity-60"
              style={{
                background:
                  "linear-gradient(90deg, var(--accent-a), var(--accent-b))",
                color: "var(--on-accent)",
              }}
            >
              {loading ? "Verifying..." : "Verify"}
            </button>

            <div className="flex items-center justify-between mt-3">
              <button
                onClick={handleClose}
                disabled={loading}
                className="text-xs"
                style={{ color: "var(--text-dim)" }}
              >
                Cancel
              </button>
              <button
                onClick={mockSendOtp}
                disabled={loading}
                className="text-xs font-medium"
                style={{ color: "var(--accent-a)" }}
              >
                Resend code
              </button>
            </div>
          </>
        )}

        {step === STEP.SUCCESS && (
          <div className="flex flex-col items-center text-center py-2">
            <div className="otp-check-wrap mb-4">
              <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
                <circle
                  className="otp-check-circle"
                  cx="28"
                  cy="28"
                  r="24"
                  stroke="var(--success)"
                  strokeWidth="2.5"
                />
                <path
                  className="otp-check-tick"
                  d="M18 29l7 7 13-15"
                  stroke="var(--success)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              </svg>
            </div>
            <h2 className="text-lg font-medium mb-1">
              Two-step verification is on
            </h2>
            <p className="text-sm mb-6" style={{ color: "var(--text-dim)" }}>
              Your account now requires a code at sign-in on new devices.
            </p>
            <button
              onClick={handleClose}
              className="w-full rounded-xl py-2.5 font-medium transition"
              style={{
                background:
                  "linear-gradient(90deg, var(--accent-a), var(--accent-b))",
                color: "var(--on-accent)",
              }}
            >
              Done
            </button>
          </div>
        )}

        {step === STEP.ERROR && (
          <div className="flex flex-col items-center text-center py-2">
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center mb-4"
              style={{ background: "rgba(255,84,112,0.14)" }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 9v4M12 17h.01M10.3 3.9 2.6 17.5A2 2 0 0 0 4.3 20.5h15.4a2 2 0 0 0 1.7-3l-7.7-13.6a2 2 0 0 0-3.4 0Z"
                  stroke="var(--danger)"
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <h2 className="text-lg font-medium mb-1">
              We couldn't verify you
            </h2>
            <p className="text-sm mb-6" style={{ color: "var(--text-dim)" }}>
              {errorReason ||
                "Something went wrong and this request is unauthorized."}
            </p>
            <button
              onClick={handleClose}
              className="w-full rounded-xl py-2.5 font-medium border transition"
              style={{
                borderColor: "var(--border)",
                color: "var(--text)",
                background: "transparent",
              }}
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// --- demo harness so the flow is viewable/testable on its own ---
export default function OtpDemo() {
  const [open, setOpen] = useState(false);
  const [enabled, setEnabled] = useState(false);

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ ...THEME, background: "#0e0e15" }}
    >
      <div
        className="w-full max-w-sm rounded-2xl border p-5"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium" style={{ color: "var(--text)" }}>
              Two-step verification
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-dim)" }}>
              {enabled ? "Enabled" : "Not enabled"}
            </p>
          </div>
          <button
            onClick={() => !enabled && setOpen(true)}
            className="text-xs font-medium px-3 py-1.5 rounded-lg"
            style={{
              background: enabled ? "var(--surface-hover)" : "var(--accent-a)",
              color: enabled ? "var(--text-dim)" : "var(--on-accent)",
            }}
          >
            {enabled ? "Enabled" : "Enable"}
          </button>
        </div>
      </div>

      <OtpModal
        open={open}
        onClose={() => setOpen(false)}
        destination="priya@araamusic.com"
        onEnabled={() => setEnabled(true)}
      />
    </div>
  );
}
