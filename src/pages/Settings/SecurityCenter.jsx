import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth.js";
import Loader  from "../../components/common/Loader"

function Row({ label, status, ok, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between py-3.5 px-1 border-b text-left"
      style={{ borderColor: "var(--border)" }}
    >
      <div>
        <p className="text-sm font-medium" style={{ color: "var(--text)" }}>{label}</p>
        <p className="text-xs mt-0.5" style={{ color: ok ? "var(--accent-solid)" : "var(--text-dim)" }}>
          {status}
        </p>
      </div>
      <span
        className="text-xs font-medium px-3 py-1.5 rounded-lg"
        style={{
          background: danger ? "transparent" : "var(--surface)",
          color: danger ? "var(--danger)" : "var(--text-dim)",
          border: danger ? "1px solid var(--danger)" : "none",
        }}
      >
        {ok && !danger ? "Manage" : danger ? "Turn off" : "Set up"}
      </span>
    </button>
  );
}

export default function SecurityCenter() {
  const navigate = useNavigate();
  const { security, generateBackupCodes } = useAuth();

  if (!security) return <Loader label={"Please Wait..."} />; // loading

  const go = (purpose) => navigate(`/settings/security/${purpose}`);

  return (
    <div className="max-w-md mx-auto px-5 py-6" style={{ color: "var(--text)" }}>
      <h1 className="text-xl font-semibold mb-1">Security</h1>
      <p className="text-sm mb-6" style={{ color: "var(--text-dim)" }}>
        Keep your account protected and recoverable.
      </p>

      <div className="mb-6">
        <p className="text-xs uppercase tracking-wide mb-1" style={{ color: "var(--text-faint)" }}>
          Contact methods
        </p>
        <Row
          label="Email address"
          status={security.emailVerified ? "Verified" : "Not verified"}
          ok={security.emailVerified}
          onClick={() => go("email")}
        />
        <Row
          label="Phone number"
          status={security.phoneVerified ? security.phone : "Not added"}
          ok={security.phoneVerified}
          onClick={() => go("phone")}
        />
      </div>

      <div className="mb-6">
        <p className="text-xs uppercase tracking-wide mb-1" style={{ color: "var(--text-faint)" }}>
          Recovery
        </p>
        <Row
          label="Backup email"
          status={security.backupEmailVerified ? "Verified" : "Not added — recommended"}
          ok={security.backupEmailVerified}
          onClick={() => go("backupEmail")}
        />
        <Row
          label="Backup phone"
          status={security.backupPhoneVerified ? "Verified" : "Not added — recommended"}
          ok={security.backupPhoneVerified}
          onClick={() => go("backupPhone")}
        />
        <Row
          label="Backup codes"
          status={
            security.backupCodesRemaining > 0
              ? `${security.backupCodesRemaining} unused codes`
              : "None generated — use if you lose your device"
          }
          ok={security.backupCodesRemaining > 0}
          onClick={() => navigate("/settings/security/backup-codes")}
        />
      </div>

      {/*   <div className="mb-6">
        <p className="text-xs uppercase tracking-wide mb-1" style={{ color: "var(--text-faint)" }}>
          Sign-in
        </p>
        <Row
          label="Two-step verification"
          status={security.twoStepEnabled ? "On" : "Off — recommended"}
          ok={security.twoStepEnabled}
          danger={security.twoStepEnabled}
          onClick={() => go(security.twoStepEnabled ? "disableTwoStep" : "twoStep")}
        />
        <button
          onClick={() => navigate("/settings/security/devices")}
          className="w-full flex items-center justify-between py-3.5 px-1 text-left"
        >
          <div>
            <p className="text-sm font-medium">Trusted devices</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-dim)" }}>
              {security.devices.length} device{security.devices.length === 1 ? "" : "s"} (max 5)
            </p>
          </div>
          <span className="text-xs font-medium px-3 py-1.5 rounded-lg" style={{ background: "var(--surface)", color: "var(--text-dim)" }}>
            View
          </span>
        </button>
      </div>
      */}
    </div>
  );
}
