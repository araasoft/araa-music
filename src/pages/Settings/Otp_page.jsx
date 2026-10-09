import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth.js";
import CodeInput from "../../components/common/CodeInput.jsx";

const STEP = { START: "start", TARGET: "target", OTP: "otp", SUCCESS: "success" };

const PURPOSE_CONFIG = {
  email: {
    needsTarget: true,
    targetType: "email",
    title: "Verify your email",
    blurb: "We'll send a code to confirm it's really you.",
    successTitle: "Email verified",
  },
  phone: {
    needsTarget: true,
    targetType: "tel",
    title: "Add & verify your phone number",
    blurb: "Used for account recovery and, if you enable it, sign-in codes.",
    successTitle: "Phone number verified",
  },
  backupEmail: {
    needsTarget: true,
    targetType: "email",
    title: "Add a backup email",
    blurb: "A recovery email lets you get back in if you lose access to your primary email.",
    successTitle: "Backup email verified",
  },
  backupPhone: {
    needsTarget: true,
    targetType: "tel",
    title: "Add a backup phone number",
    blurb: "A recovery number lets you get back in if you lose access to your primary email.",
    successTitle: "Backup phone verified",
  },
  twoStep: {
    needsTarget: false,
    title: "Turn on two-step verification",
    blurb: "Add an extra layer of security. You'll enter a code from your email each time you sign in on a new device.",
    successTitle: "Two-step verification is on",
  },
  disableTwoStep: {
    needsTarget: false,
    danger: true,
    title: "Turn off two-step verification",
    blurb: "Without this, a stolen or guessed password is enough for someone to get into your account.",
    successTitle: "Two-step verification is off",
  },
};

function maskEmail(email) {
  if (!email) return "";
  const [name, domain] = email.split("@");
  if (!domain) return email;
  const visible = name.slice(0, 2);
  return `${visible}${"•".repeat(Math.max(name.length - 2, 3))}@${domain}`;
}

// variant="manage": reached from Settings while fully authenticated
//   (purpose comes from the route, e.g. /settings/security/:purpose)
// variant="verify": the login gate — account already has 2FA on, THIS
//   device just needs to prove itself. Always purpose="twoStep", skips
//   straight to OTP, fires the code automatically on mount.
export default function Otp_page({ variant = "manage" }) {
  const navigate = useNavigate();
  const { purpose: routePurpose } = useParams();
  const purpose = variant === "verify" ? "twoStep" : routePurpose;
  const config = PURPOSE_CONFIG[purpose];

  const { user, startVerification, confirmVerification } = useAuth();

  const [step, setStep] = useState(variant === "verify" ? STEP.OTP : STEP.START);
  const [target, setTarget] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) navigate(-1);
  }, [user]);

  useEffect(() => {
    if (variant === "verify") sendCode();
  }, []);

  useEffect(() => {
    if (!config) navigate(-1);
  }, [config]);

  if (!config) {
    return null;
  }

  async function sendCode() {
    setLoading(true);
    setError("");
    try {
      await startVerification(purpose, config.needsTarget ? target : undefined);
      setStep(STEP.OTP);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCode(code) {
    setLoading(true);
    setError("");
    try {
      await confirmVerification(purpose, code);
      if (variant === "verify") {
        navigate("/", { replace: true });
      } else {
        setStep(STEP.SUCCESS);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function goBack() {
    if (loading) return;
    navigate(-1);
  }

  return (
    <div
      className="fixed inset-0 h-[100dvh] w-full overflow-hidden flex items-center justify-center px-5"
      style={{ background: "var(--bg)" }}
    >
      <div
        className="w-full max-w-sm rounded-2xl border p-6 shadow-2xl"
        style={{ background: "var(--bg-elev)", borderColor: "var(--border)", color: "var(--text)" }}
      >
        {step === STEP.START && (
          <>
            <h2 className="text-lg font-medium mb-1">{config.title}</h2>
            <p className="text-sm mb-6" style={{ color: "var(--text-dim)" }}>
              {config.blurb}
            </p>
            <button
              onClick={() => setStep(config.needsTarget ? STEP.TARGET : STEP.OTP)}
              className="w-full rounded-xl py-2.5 font-medium transition"
              style={{
                background: config.danger
                  ? "var(--danger)"
                  : "linear-gradient(90deg, var(--accent-a), var(--accent-b))",
                color: "var(--on-accent)",
              }}
            >
              Continue
            </button>
            <button
              onClick={goBack}
              className="w-full mt-2 rounded-xl py-2.5 font-medium border transition"
              style={{ borderColor: "var(--border)", color: "var(--text-dim)", background: "transparent" }}
            >
              Not now
            </button>
          </>
        )}

        {step === STEP.TARGET && (
          <>
            <h2 className="text-lg font-medium mb-1">{config.title}</h2>
            <p className="text-sm mb-4" style={{ color: "var(--text-dim)" }}>
              {config.targetType === "email"
                ? "Enter the email address to verify."
                : "Enter the phone number to verify, e.g. +14155550123."}
            </p>
            <input
              type={config.targetType === "email" ? "email" : "tel"}
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder={config.targetType === "email" ? "you@example.com" : "+14155550123"}
              className="w-full rounded-xl px-3 py-2.5 mb-2 border outline-none"
              style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text)" }}
            />
            {error && (
              <p className="text-xs mb-2" style={{ color: "var(--danger)" }}>
                {error}
              </p>
            )}
            <button
              onClick={sendCode}
              disabled={loading || !target}
              className="w-full rounded-xl py-2.5 font-medium transition disabled:opacity-60"
              style={{
                background: "linear-gradient(90deg, var(--accent-a), var(--accent-b))",
                color: "var(--on-accent)",
              }}
            >
              {loading ? "Sending..." : "Send code"}
            </button>
            <button
              onClick={() => setStep(STEP.START)}
              disabled={loading}
              className="w-full mt-2 rounded-xl py-2.5 font-medium border transition"
              style={{ borderColor: "var(--border)", color: "var(--text-dim)", background: "transparent" }}
            >
              Go back
            </button>
          </>
        )}

        {step === STEP.OTP && (
          <>
            <h2 className="text-lg font-medium mb-1">Enter verification code</h2>
            <p className="text-sm mb-5" style={{ color: "var(--text-dim)" }}>
              We sent a code to{" "}
              {config.needsTarget ? maskEmail(target) || target : maskEmail(user?.email)}.
            </p>
            <CodeInput onComplete={handleCode} disabled={loading} error={error} />
            <div className="h-4 mt-2 mb-1">
              {error && (
                <p className="text-xs" style={{ color: "var(--danger)" }}>
                  {error}
                </p>
              )}
            </div>
            <div className="flex items-center justify-between mt-3">
              <button onClick={goBack} disabled={loading} className="text-xs" style={{ color: "var(--text-faint)" }}>
                Cancel
              </button>
              <button
                onClick={sendCode}
                disabled={loading}
                className="text-xs font-medium"
                style={{ color: "var(--accent-solid)" }}
              >
                Resend code
              </button>
            </div>
            {variant === "verify" && (
              <button
                onClick={() => navigate("/recover-backup-code")}
                disabled={loading}
                className="w-full mt-3 text-xs text-center"
                style={{ color: "var(--text-faint)" }}
              >
                Lost this device? Use a backup code instead
              </button>
            )}
          </>
        )}

        {step === STEP.SUCCESS && (
          <div className="flex flex-col items-center text-center py-2">
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center mb-4"
              style={{ background: "var(--surface)" }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path
                  d="M5 13l4 4L19 7"
                  stroke="var(--accent-solid)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h2 className="text-lg font-medium mb-1">{config.successTitle}</h2>
            <button
              onClick={() => navigate(-1)}
              className="w-full mt-4 rounded-xl py-2.5 font-medium transition"
              style={{
                background: "linear-gradient(90deg, var(--accent-a), var(--accent-b))",
                color: "var(--on-accent)",
              }}
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
