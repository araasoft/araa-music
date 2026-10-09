import { useEffect, useRef, useState } from "react";

const LENGTH = 6;

export default function CodeInput({ onComplete, disabled, error }) {
  const [digits, setDigits] = useState(Array(LENGTH).fill(""));
  const [shakeKey, setShakeKey] = useState(0);
  const [pulses, setPulses] = useState({});
  const inputRefs = useRef([]);

  useEffect(() => {
    const t = setTimeout(() => inputRefs.current[0]?.focus(), 60);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (error) setShakeKey((k) => k + 1);
  }, [error]);

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

  function handleChange(i, value) {
    const v = value.replace(/[^0-9]/g, "").slice(-1);
    const next = [...digits];
    next[i] = v;
    setDigits(next);
    if (v) {
      triggerPulse([i]);
      if (i < LENGTH - 1) inputRefs.current[i + 1]?.focus();
      else inputRefs.current[i]?.blur();
    }
    if (next.every((d) => d)) onComplete(next.join(""));
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
    const next = Array(LENGTH).fill("");
    const filled = [];
    for (let i = 0; i < Math.min(LENGTH, text.length); i++) {
      next[i] = text[i];
      filled.push(i);
    }
    setDigits(next);
    triggerPulse(filled);
    const lastFilled = Math.min(LENGTH, text.length) - 1;
    inputRefs.current[lastFilled >= 0 ? lastFilled : 0]?.focus();
    if (next.every((d) => d)) onComplete(next.join(""));
  }

  return (
    <div
      key={shakeKey}
      className={`flex justify-center gap-2 ${error ? "otp-shake" : ""}`}
      onPaste={handlePaste}
    >
      {digits.map((d, i) => {
        const pulseDelay = pulses[i];
        return (
          <input
            key={i}
            ref={(el) => (inputRefs.current[i] = el)}
            value={d}
            disabled={disabled}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onAnimationEnd={() => clearPulse(i)}
            inputMode="numeric"
            maxLength={1}
            className={`w-10 h-12 text-center text-xl rounded-xl border-2 outline-none transition-all duration-150 ${
              pulseDelay !== undefined ? "otp-pulse" : ""
            }`}
            style={{
              animationDelay: pulseDelay !== undefined ? `${pulseDelay}ms` : undefined,
              background: "var(--surface)",
              borderColor: error ? "var(--danger)" : "var(--border)",
              color: error ? "var(--danger)" : "var(--text)",
              opacity: disabled ? 0.6 : 1,
            }}
          />
        );
      })}
    </div>
  );
}
