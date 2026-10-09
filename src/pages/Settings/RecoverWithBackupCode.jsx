import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth.js";

export default function RecoverWithBackupCode() {
  const navigate = useNavigate();
  const { user, consumeBackupCode } = useAuth();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!user) {
    navigate("/login", { replace: true });
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await consumeBackupCode(code.trim().toUpperCase());
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 h-[100dvh] w-full flex items-center justify-center px-5"
      style={{ background: "var(--bg)" }}
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl border p-6 shadow-2xl"
        style={{ background: "var(--bg-elev)", borderColor: "var(--border)", color: "var(--text)" }}
      >
        <h2 className="text-lg font-medium mb-1">Use a backup code</h2>
        <p className="text-sm mb-4" style={{ color: "var(--text-dim)" }}>
          Enter one of the backup codes you saved when you set up two-step verification. Each code
          works once.
        </p>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="XXXX-XXXX"
          className="w-full rounded-xl px-3 py-2.5 mb-2 border outline-none font-mono uppercase"
          style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text)" }}
        />
        {error && (
          <p className="text-xs mb-2" style={{ color: "var(--danger)" }}>
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={loading || !code}
          className="w-full rounded-xl py-2.5 font-medium transition disabled:opacity-60"
          style={{ background: "linear-gradient(90deg, var(--accent-a), var(--accent-b))", color: "var(--on-accent)" }}
        >
          {loading ? "Verifying..." : "Verify"}
        </button>
        <button
          type="button"
          onClick={() => navigate("/one-time-password")}
          className="w-full mt-2 rounded-xl py-2.5 font-medium border transition"
          style={{ borderColor: "var(--border)", color: "var(--text-dim)", background: "transparent" }}
        >
          Back to email code
        </button>
      </form>
    </div>
  );
}
