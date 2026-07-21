import { Link } from "react-router-dom";
import { FileQuestion } from "lucide-react";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-4 py-24">
      <FileQuestion className="h-16 w-16 text-muted-foreground" />
      <h1 className="text-2xl font-bold">Halaman Tidak Ditemukan</h1>
      <p className="text-muted-foreground">Halaman yang Anda cari tidak tersedia.</p>
      <Link to="/" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
        Kembali ke Dashboard
      </Link>
    </div>
  );
}
