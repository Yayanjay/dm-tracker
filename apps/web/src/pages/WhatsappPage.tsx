import { useEffect, useState, useRef, useCallback } from "react";
import api from "../lib/api";
import { Smartphone, CheckCircle, XCircle, RefreshCw, Loader2 } from "lucide-react";

interface SessionStatus {
  status: string;
  number: string | null;
}

const statusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  STOPPED: { label: "Terhenti", color: "bg-gray-500", icon: XCircle },
  STARTING: { label: "Memulai...", color: "bg-yellow-500", icon: Loader2 },
  SCAN_QR_CODE: { label: "Scan QR Code", color: "bg-blue-500", icon: Loader2 },
  WORKING: { label: "Terhubung", color: "bg-green-500", icon: CheckCircle },
  FAILED: { label: "Gagal", color: "bg-red-500", icon: XCircle },
};

export default function WhatsappPage() {
  const [status, setStatus] = useState<SessionStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [qrTs, setQrTs] = useState(Date.now());
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval>>();
  const qrBlobRef = useRef<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const { data } = await api.get("/whatsapp/session/status");
      setStatus(data.data);
    } catch {
      // ignore
    }
  }, []);

  const fetchQr = useCallback(async () => {
    try {
      const response = await api.get("/whatsapp/session/qr", {
        responseType: "blob",
      });
      if (qrBlobRef.current) URL.revokeObjectURL(qrBlobRef.current);
      const blobUrl = URL.createObjectURL(response.data);
      qrBlobRef.current = blobUrl;
      setQrUrl(blobUrl);
    } catch {
      setQrUrl(null);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    return () => clearInterval(pollingRef.current);
  }, [fetchStatus]);

  useEffect(() => {
    return () => {
      if (qrBlobRef.current) URL.revokeObjectURL(qrBlobRef.current);
    };
  }, []);

  useEffect(() => {
    clearInterval(pollingRef.current);
    if (status?.status === "SCAN_QR_CODE" || status?.status === "STARTING") {
      pollingRef.current = setInterval(fetchStatus, 3000);
    }
    return () => clearInterval(pollingRef.current);
  }, [status?.status, fetchStatus]);

  useEffect(() => {
    if (status?.status === "SCAN_QR_CODE") {
      fetchQr();
    } else {
      if (qrBlobRef.current) {
        URL.revokeObjectURL(qrBlobRef.current);
        qrBlobRef.current = null;
      }
      setQrUrl(null);
    }
  }, [status?.status, qrTs, fetchQr]);

  const handleAction = async (action: "start" | "stop") => {
    setLoading(true);
    try {
      await api.post(`/whatsapp/session/${action}`);
      await fetchStatus();
    } catch (err: any) {
      alert(err.response?.data?.message || "Gagal");
    }
    setLoading(false);
  };

  const config = status ? statusConfig[status.status] || statusConfig.STOPPED : null;

  return (
    <div className="max-w-xl space-y-6">
      <div className="flex items-center gap-3">
        <Smartphone className="h-6 w-6" />
        <h2 className="text-xl font-bold">WhatsApp Session</h2>
      </div>

      {config && (
        <div className="flex items-center gap-3 rounded-lg border p-4">
          <div className={`h-3 w-3 rounded-full ${config.color}`} />
          <div>
            <p className="font-medium">{config.label}</p>
            {status?.status === "WORKING" && status.number && (
              <p className="text-sm text-muted-foreground">{status.number}</p>
            )}
          </div>
        </div>
      )}

      {status?.status === "SCAN_QR_CODE" && qrUrl && (
        <div className="rounded-lg border p-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            Scan QR code ini dari WhatsApp → Perangkat tertaut → Tautkan perangkat
          </p>
          <img
            src={qrUrl}
            alt="QR Code"
            className="mx-auto w-64 h-64"
          />
          <button
            onClick={() => setQrTs(Date.now())}
            className="flex items-center gap-2 text-sm text-primary"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh QR
          </button>
        </div>
      )}

      {status?.status === "SCAN_QR_CODE" && !qrUrl && (
        <div className="rounded-lg border p-4 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">Memuat QR Code...</p>
        </div>
      )}

      <div className="flex gap-3">
        {status?.status !== "WORKING" && (
          <button
            onClick={() => handleAction("start")}
            disabled={loading}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? "..." : "Mulai Session"}
          </button>
        )}
        {status?.status === "WORKING" && (
          <button
            onClick={() => handleAction("stop")}
            disabled={loading}
            className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            Hentikan Session
          </button>
        )}
      </div>
    </div>
  );
}
