import { useEffect, useState } from "react";
import { useAuth } from "../../hooks/useAuth.js";

export default function TrustedDevices() {
  const { listDevices, removeDevice } = useAuth();
  const [devices, setDevices] = useState(null);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    listDevices().then(setDevices);
  }, []);

  async function handleRemove(id) {
    setBusyId(id);
    try {
      await removeDevice(id);
      setDevices((prev) => prev.filter((d) => d.id !== id));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="max-w-md mx-auto px-5 py-6" style={{ color: "var(--text)" }}>
      <h1 className="text-xl font-semibold mb-1">Trusted devices</h1>
      <p className="text-sm mb-6" style={{ color: "var(--text-dim)" }}>
        Up to 5 devices can be trusted at once. Removing a device here signs it out of two-step
        verification — it'll need a new code next time.
      </p>

      {devices?.map((d) => (
        <div
          key={d.id}
          className="flex items-center justify-between py-3.5 border-b"
          style={{ borderColor: "var(--border)" }}
        >
          <div>
            <p className="text-sm font-medium">
              {d.name} {d.current && <span style={{ color: "var(--accent-solid)" }}>(this device)</span>}
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-dim)" }}>
              Last active {d.lastSeen ? new Date(d.lastSeen).toLocaleDateString() : "unknown"}
            </p>
          </div>
          {!d.current && (
            <button
              onClick={() => handleRemove(d.id)}
              disabled={busyId === d.id}
              className="text-xs font-medium px-3 py-1.5 rounded-lg"
              style={{ border: "1px solid var(--danger)", color: "var(--danger)" }}
            >
              {busyId === d.id ? "Removing..." : "Remove"}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
