import { useState } from "react";
import api from "../lib/api";
import { useToast } from "../lib/toast";
import { QRCodeSVG } from "qrcode.react";

export default function EnrollmentQr({ patientId }: { patientId: string }) {
  const { toast } = useToast();
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const show = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/patients/${patientId}/enrollment-link`);
      setUrl(res.data.data.url);
    } catch (err: any) {
      toast(err.response?.data?.message || "Gagal membuat QR", "error");
    }
    setLoading(false);
  };

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-medium">QR Pendaftaran</p>
          <p className="text-sm text-muted-foreground">
            Scan dengan WhatsApp pasien, lalu kirim pesan untuk menyetujui keikutsertaan.
          </p>
        </div>
        <button
          onClick={show}
          disabled={loading}
          className="shrink-0 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {loading ? "..." : "Tampilkan QR"}
        </button>
      </div>
      {url && (
        <div className="flex justify-center">
          <QRCodeSVG value={url} size={200} />
        </div>
      )}
    </div>
  );
}
