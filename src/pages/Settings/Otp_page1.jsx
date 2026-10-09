import { useState, useEffect, useRef } from "react";
import { useSettings } from "../context/SettingsContext.jsx";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.jsx";

/**
 * Full-screen two-step verification page (not a modal — routed to directly,
 * e.g. <Route path="/settings/two-step" element={<TwoStepVerificationPage />} />).
 *
 * Handles BOTH directions from one flow:
 *  - enabling:  start -> confirm -> email -> otp -> success
 *  - disabling: start -> warning -> confirm -> email -> otp -> success
 * Direction is read from settings.twoStepVerification.
 */

const STEP = {
  START: "start",
  WARNING: "warning",
  CONFIRM: "confirm",
  EMAIL: "email",
  OTP: "otp",
  SUCCESS: "success",
  ERROR: "error",
};

const OTP_LENGTH = 6;
const DEMO_CODE = "123456";
const MAX_ATTEMPTS = 3;

function maskEmail(email) {
  if (!email) return "";
  const [name, domain] = email.split("@");
  if (!domain) return email;
  const visible = name.slice(0, 2);
  return `${visible}${"•".repeat(Math.max(name.length - 2, 3))}@${domain}`;
}

export default function Otp_page({ theme = "aurora" }) {
  const navigate = useNavigate();
  const { user, sendTwoStepCode, confirmTwoStepCode } = useAuth();
  const { settings, update } = useSettings();

  const isEnabled = !!settings?.twoStepVerification;
  const mode = isEnabled ? "disable" : "enable";

  const sequence =
    mode === "disable"
      ? [STEP.START, STEP.WARNING, STEP.CONFIRM, STEP.EMAIL, STEP.OTP]
      : [STEP.START, STEP.CONFIRM, STEP.EMAIL, STEP.OTP];

  const [step, setStep] = useState(STEP.START);
  const [digits, setDigits] = useState(Array(OTP_LENGTH).fill(""));
  const [pulses, setPulses] = useState({});
  const [shakeKey, setShakeKey] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [errorReason, setErrorReason] = useState("");
  const inputRefs = useRef([]);

  useEffect(() => {
    if (step === STEP.OTP) {
      const t = setTimeout(() => inputRefs.current[0]?.focus(), 60);
      return () => clearTimeout(t);
    }
  }, [step]);

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
      if (i < OTP_LENGTH - 1) inputRefs.current[i + 1]?.focus();
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
    const next = Array(OTP_LENGTH).fill("");
    const filled = [];
    for (let i = 0; i < Math.min(OTP_LENGTH, text.length); i++) {
      next[i] = text[i];
      filled.push(i);
    }
    setDigits(next);
    setError("");
    triggerPulse(filled);
    const lastFilled = Math.min(OTP_LENGTH, text.length) - 1;
    inputRefs.current[lastFilled >= 0 ? lastFilled : 0]?.focus();
  }

  async function sendOtp() {
    setLoading(true);  
    const data = await sendTwoStepCode();
    console.log("From Check otp : ", data)
    setLoading(false);
    setDigits(Array(OTP_LENGTH).fill(""));
    setError("");
    setStep(STEP.OTP);
  }

  async function verifyOtp() {
    const code = digits.join("");
    if (code.length < OTP_LENGTH) {
      setError(`Enter all ${OTP_LENGTH} digits`);
      triggerShake();
      return;
    }
    setLoading(true);
    const data = await confirmTwoStepCode(code);
    console.log("From Check otp : ", data)
    setLoading(false);

    // if (code === DEMO_CODE) {
    //   setError("");
    //   update({ twoStepVerification: mode === "enable" });
    //   setStep(STEP.SUCCESS);
    // } else {
    //   const nextAttempts = attempts + 1;
    //   setAttempts(nextAttempts);
    //   setDigits(Array(OTP_LENGTH).fill(""));
    //   triggerShake();
    //   if (nextAttempts >= MAX_ATTEMPTS) {
    //     setErrorReason(
    //       "Too many incorrect attempts. For your security, we've blocked this request.",
    //     );
    //     setStep(STEP.ERROR);
    //   } else {
    //     setError(
    //       `Incorrect code. ${MAX_ATTEMPTS - nextAttempts} attempt${
    //         MAX_ATTEMPTS - nextAttempts === 1 ? "" : "s"
    //       } left.`,
    //     );
    //     setTimeout(() => inputRefs.current[0]?.focus(), 60);
    //   }
    // }
  }

  function goBack() {
    if (loading) return;
    navigate(-1);
  }

  function finish() {
    navigate("/settings#security");
  }

  const code = digits.join("");
  const isComplete = code.length === OTP_LENGTH;
  const seqIndex = sequence.indexOf(step);

  useEffect(() => {
    if(!user && !user?.email){
      return navigate(-1)
    }
  }, [user, loading])

  return (
    <div
      className="fixed inset-0 h-[100dvh] w-full overflow-hidden flex items-center justify-center px-5"
      style={{ background: "var(--bg)" }}
    >
      <div
        key={step}
        className="otp-card w-full max-w-sm rounded-2xl border p-6 shadow-2xl"
        style={{
          background: "var(--bg-elev)",
          borderColor: "var(--border)",
          color: "var(--text)",
        }}
      >
        {seqIndex !== -1 && (
          <div className="flex items-center gap-1.5 mb-5">
            {sequence.map((s, i) => (
              <div
                key={s}
                className="h-1 flex-1 rounded-full transition-colors duration-300"
                style={{
                  background:
                    i <= seqIndex ? "var(--accent-solid)" : "var(--border)",
                }}
              />
            ))}
          </div>
        )}

        {step === STEP.START && (
          <>
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center mb-4"
              style={{ background: "var(--surface)" }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 2 4 5v6c0 5 3.4 9 8 11 4.6-2 8-6 8-11V5l-8-3Z"
                  stroke="var(--accent-solid)"
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h2 className="text-lg font-medium mb-1">
              {mode === "enable"
                ? "Turn on two-step verification"
                : "Turn off two-step verification"}
            </h2>
            <p className="text-sm mb-6" style={{ color: "var(--text-dim)" }}>
              {mode === "enable"
                ? "Add an extra layer of security. You'll enter a code from your email each time you sign in on a new device."
                : "You're about to remove the extra sign-in check on your account."}
            </p>
            <button
              onClick={() =>
                setStep(mode === "disable" ? STEP.WARNING : STEP.CONFIRM)
              }
              className="w-full rounded-xl py-2.5 font-medium transition"
              style={{
                background:
                  "linear-gradient(90deg, var(--accent-a), var(--accent-b))",
                color: "var(--on-accent)",
              }}
            >
              {mode === "enable" ? "Get started" : "Continue"}
            </button>
            <button
              onClick={() => navigate("/settings#security")}
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

        {step === STEP.WARNING && (
          <>
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center mb-4"
              style={{
                background:
                  "color-mix(in srgb, var(--danger) 16%, transparent)",
              }}
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
              This makes your account easier to break into
            </h2>
            <p className="text-sm mb-6" style={{ color: "var(--text-dim)" }}>
              Without two-step verification, a stolen or guessed password is
              enough for someone to get into your account — this is one of the
              most common ways accounts are taken over for fraud and identity
              theft. Only continue if you're sure.
            </p>
            <button
              onClick={() => setStep(STEP.CONFIRM)}
              className="w-full rounded-xl py-2.5 font-medium transition"
              style={{ background: "var(--danger)", color: "var(--on-accent)" }}
            >
              I understand, continue
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
              Keep it on
            </button>
          </>
        )}

        {step === STEP.CONFIRM && (
          <>
            <h2 className="text-lg font-medium mb-1">Before you continue</h2>
            <p className="text-sm mb-6" style={{ color: "var(--text-dim)" }}>
              {mode === "enable"
                ? "Once enabled, you can't turn this off again without verifying by email or OTP. If you ever get stuck, contact araamusic support."
                : "We'll send a one-time code to confirm it's really you before turning this off."}
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
              onClick={() =>
                setStep(mode === "disable" ? STEP.WARNING : STEP.START)
              }
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
              We'll send a {OTP_LENGTH}-digit code to
            </p>
            <p
              className="text-sm font-medium mb-6"
              style={{ color: "var(--text)" }}
            >
              {maskEmail(user?.email)}
            </p>
            <button
              onClick={sendOtp}
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
              We sent a {OTP_LENGTH}-digit code to {maskEmail(user?.email)}.
            </p>

            <div
              key={shakeKey}
              className={`flex justify-center gap-2 mb-2 ${error ? "otp-shake" : ""}`}
              onPaste={handlePaste}
            >
              {digits.map((d, i) => {
                const pulseDelay = pulses[i];
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
                        pulseDelay !== undefined
                          ? `${pulseDelay}ms`
                          : undefined,
                      background: "var(--surface)",
                      borderColor: error
                        ? "var(--danger)"
                        : isComplete
                          ? "var(--accent-solid)"
                          : "var(--border)",
                      color: error ? "var(--danger)" : "var(--text)",
                      opacity: loading ? 0.6 : 1,
                    }}
                    onFocus={(e) => {
                      if (!error)
                        e.target.style.borderColor = "var(--accent-a)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = error
                        ? "var(--danger)"
                        : isComplete
                          ? "var(--accent-solid)"
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
              onClick={verifyOtp}
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
                onClick={goBack}
                disabled={loading}
                className="text-xs"
                style={{ color: "var(--text-faint)" }}
              >
                Cancel
              </button>
              <button
                onClick={sendOtp}
                disabled={loading}
                className="text-xs font-medium"
                style={{ color: "var(--accent-solid)" }}
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
                  stroke={
                    mode === "enable"
                      ? "var(--accent-solid)"
                      : "var(--text-dim)"
                  }
                  strokeWidth="2.5"
                />
                <path
                  className="otp-check-tick"
                  d="M18 29l7 7 13-15"
                  stroke={
                    mode === "enable"
                      ? "var(--accent-solid)"
                      : "var(--text-dim)"
                  }
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              </svg>
            </div>
            <h2 className="text-lg font-medium mb-1">
              {mode === "enable"
                ? "Two-step verification is on"
                : "Two-step verification is off"}
            </h2>
            <p className="text-sm mb-6" style={{ color: "var(--text-dim)" }}>
              {mode === "enable"
                ? "Your account now requires a code at sign-in on new devices."
                : "Your account no longer requires a code at sign-in. You can turn it back on anytime in Settings."}
            </p>
            <button
              onClick={finish}
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
              style={{
                background:
                  "color-mix(in srgb, var(--danger) 16%, transparent)",
              }}
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
            <h2 className="text-lg font-medium mb-1">We couldn't verify you</h2>
            <p className="text-sm mb-6" style={{ color: "var(--text-dim)" }}>
              {errorReason ||
                "Something went wrong and this request is unauthorized."}
            </p>
            <button
              onClick={() => navigate("/settings#security")}
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
