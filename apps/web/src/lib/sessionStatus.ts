import { CheckCircle, XCircle, Loader2, type LucideIcon } from "lucide-react";

export interface SessionStatus {
  status: string;
  number: string | null;
}

export const statusConfig: Record<
  string,
  { label: string; color: string; icon: LucideIcon }
> = {
  STOPPED: { label: "Terhenti", color: "bg-gray-500", icon: XCircle },
  STARTING: { label: "Memulai...", color: "bg-yellow-500", icon: Loader2 },
  SCAN_QR_CODE: { label: "Scan QR Code", color: "bg-blue-500", icon: Loader2 },
  WORKING: { label: "Terhubung", color: "bg-green-500", icon: CheckCircle },
  FAILED: { label: "Gagal", color: "bg-red-500", icon: XCircle },
};
