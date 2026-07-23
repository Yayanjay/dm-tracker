import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import { statusConfig, SessionStatus } from "../lib/sessionStatus";

export default function SessionStatusIndicator() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<SessionStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const fetchStatus = async () => {
      try {
        const { data } = await api.get("/whatsapp/session/status");
        if (active) setStatus(data.data);
      } catch {
        // keep last known status; ignore transient errors
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 20000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const config = status ? statusConfig[status.status] || statusConfig.STOPPED : null;

  return (
    <button
      type="button"
      onClick={() => navigate("/whatsapp")}
      className="mb-4 flex w-full items-center gap-2 rounded-md border px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted"
      title="Lihat status sesi WhatsApp"
    >
      <span
        className={`h-2.5 w-2.5 rounded-full ${
          loading || !config ? "bg-gray-400" : config.color
        }`}
      />
      <span className="flex-1 text-left">
        {loading ? "Mengecek sesi…" : config?.label ?? "Tidak diketahui"}
      </span>
      {status?.status === "WORKING" && status.number && (
        <span className="text-xs">{status.number}</span>
      )}
    </button>
  );
}
