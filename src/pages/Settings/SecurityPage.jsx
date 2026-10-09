import React, { useState, useEffect } from "react";
import {
  Lock,
  ChevronLeft,
  Fingerprint,
  ShieldAlert,
  Smartphone,
} from "lucide-react";
import { useSettings } from "../../context/SettingsContext.jsx";
import { useNavigate } from "react-router-dom";
import { OtpModal } from "../../utils/OtpModel.jsx";
import { showToast } from "../../utils/toast.js";
import Toggle from "../../components/common/Toggle.jsx";
import Loader from "../../components/common/Loader";
import { useAuth } from "../../hooks/useAuth.js";

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

export default function SecurityPage() {
  const { settings, setBiometricLock } = useSettings();
  const { security, listDevices, removeDevice } = useAuth();
  const [devices, setDevices] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const navigate = useNavigate();

  const go = (purpose) => navigate(`/settings/security/${purpose}`);

  useEffect(() => {
    async function fetchDevices() {
      const data = await listDevices();
      console.log(data);
    }

    fetchDevices();
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

  if (!security) return <Loader label={"Please Wait..."} />; // loading

  return (
    <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-10 max-w-2xl animate-slideUp">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate("/settings")}
          className="p-2 rounded-lg hover:bg-[var(--surface)] transition-colors"
        >
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="font-display text-xl sm:text-2xl font-bold">
            Security
          </h1>
          <p className="text-sm text-[var(--text-dim)]">
            Protect AraaMusic when you're away
          </p>
        </div>
      </div>

      {/* Biometric Lock */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/50 p-5 sm:p-6 mb-6">
        <div className="flex items-start gap-3 mb-5">
          <div className="w-9 h-9 rounded-lg bg-[var(--accent-a)]/10 flex items-center justify-center shrink-0">
            <Fingerprint size={18} className="text-[var(--accent-a)]" />
          </div>
          <div>
            <h3 className="font-semibold text-base">Biometric Lock</h3>
            <p className="text-xs text-[var(--text-dim)] mt-1">
              Use fingerprint or face recognition to unlock the app
            </p>
          </div>
        </div>

        <Row label="Enable biometric lock">
          <Toggle
            checked={settings.biometricLock}
            onChange={(v) => {
              setBiometricLock(v);
              showToast(
                v ? "Biometric lock enabled" : "Biometric lock disabled",
              );
            }}
            label="Biometric lock"
          />
        </Row>
      </div>

      {/* Two-Step Verification */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/50 p-5 sm:p-6 mb-6">
        <div className="flex items-start gap-3 mb-5">
          <div className="w-9 h-9 rounded-lg bg-[var(--accent-a)]/10 flex items-center justify-center shrink-0">
            <ShieldAlert size={18} className="text-[var(--accent-a)]" />
          </div>
          <div>
            <h3 className="font-semibold text-base">Two-Step Verification</h3>
            <p className="text-xs text-[var(--text-dim)] mt-1">
              Add an extra layer of security to your account
            </p>
          </div>
        </div>

        <button
          onClick={() =>
            go(security.twoStepEnabled ? "disableTwoStep" : "twoStep")
          }
          className="w-full rounded-lg border border-[var(--accent-a)] bg-[var(--accent-a)]/10 text-[var(--accent-a)] px-4 py-3 text-sm font-medium hover:bg-[var(--accent-a)]/20 transition-colors"
        >
          {security.twoStepEnabled ? "Manage" : "Enable"}
        </button>
      </div>

      {/* Session Management */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/50 p-5 sm:p-6 mb-6">
        <div className="flex items-start gap-3 mb-5">
          <div className="w-9 h-9 rounded-lg bg-[var(--accent-a)]/10 flex items-center justify-center shrink-0">
            <Smartphone size={18} className="text-[var(--accent-a)]" />
          </div>
          <div>
            <h3 className="font-semibold text-base">Trusted devices</h3>
            <p className="text-xs text-[var(--text-dim)] mt-1">
              {security.devices.length} device
              {security.devices.length === 1 ? "" : "s"} (max 5)
            </p>
          </div>
        </div>

        <button
          onClick={() => navigate("/settings/security/devices")}
          className="w-full rounded-lg border border-[var(--accent-a)] bg-[var(--accent-a)]/10 text-[var(--accent-a)] px-4 py-3 text-sm font-medium hover:bg-[var(--accent-a)]/20 transition-colors"
        >
          View
        </button>
      </div>

      {/* Danger Zone */}
      <div className="rounded-2xl border border-[var(--danger)]/30 bg-[var(--danger)]/5 p-5 sm:p-6">
        <h3 className="font-semibold text-base text-[var(--danger)] mb-3 flex items-center">
          <ShieldAlert size={18} className="text-[var(--danger)] me-[20px] ms-2" />
          Danger Zone
        </h3>
        <button className="w-full rounded-lg border border-[var(--danger)] text-[var(--danger)] px-4 py-3 text-sm font-medium hover:bg-[var(--danger)]/10 transition-colors">
          Delete Account
        </button>
        <p className="text-xs text-[var(--text-dim)] mt-3">
          This action is irreversible. Your data will be permanently deleted.
        </p>
      </div>
    </div>
  );
}
