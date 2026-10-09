import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth.js";

export default function BackupCodes() {
  const navigate = useNavigate();
  const { generateBackupCodes } = useAuth();
  const [codes, setCodes] = useState(null);
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState("");

  async function handleGenerate() {
    setLoading(true);
    setError("");
    try {
      const result = await generateBackupCodes();
      setCodes(result);
      setConfirmed(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto px-5 py-6" style={{ color: "var(--text)" }}>
      <h1 className="text-xl font-semibold mb-1">Backup codes</h1>
      <p className="text-sm mb-6" style={{ color: "var(--text-dim)" }}>
        Each code works once, to get back into your account if you lose access to your device and
        your email. Generating new codes immediately invalidates any old ones.
      </p>

      {!codes && (
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="w-full rounded-xl py-2.5 font-medium transition disabled:opacity-60"
          style={{ background: "linear-gradient(90deg, var(--accent-a), var(--accent-b))", color: "var(--on-accent)" }}
        >
          {loading ? "Generating..." : "Generate 10 backup codes"}
        </button>
      )}

      {error && (
        <p className="text-xs mt-2" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      )}

      {codes && (
        <>
          <div
            className="grid grid-cols-2 gap-2 p-4 rounded-xl mb-4 font-mono text-sm"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            {codes.map((c) => (
              <span key={c}>{c}</span>
            ))}
          </div>
          <p className="text-xs mb-4" style={{ color: "var(--danger)" }}>
            These are shown only once. Save them somewhere safe now — a password manager or printed
            copy, not a screenshot on this same device.
          </p>
          <label className="flex items-center gap-2 text-sm mb-4">
            <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
            I've saved these codes
          </label>
          <button
            onClick={() => navigate("/settings/security")}
            disabled={!confirmed}
            className="w-full rounded-xl py-2.5 font-medium transition disabled:opacity-60"
            style={{ background: "linear-gradient(90deg, var(--accent-a), var(--accent-b))", color: "var(--on-accent)" }}
          >
            Done
          </button>
        </>
      )}
    </div>
  );
}
