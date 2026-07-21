import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../lib/api";
import { useToast } from "../lib/toast";
import { Plus, Trash2 } from "lucide-react";

interface Medication {
  id: string;
  name: string;
  dosage: string;
  unit: string;
  scheduleTimes: string[];
  active: boolean;
}

interface Patient {
  id: string;
  name: string;
}

export default function PatientMedicationsPage() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [meds, setMeds] = useState<Medication[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Medication | null>(null);
  const [form, setForm] = useState({ name: "", dosage: "", unit: "", scheduleTimes: "" });
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      const { data } = await api.get(`/patients/${id}`);
      setPatient(data.data);
      setMeds(data.data.medications || []);
    } catch {
      // ignore
    }
  };

  useEffect(() => { fetchData(); }, [id]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", dosage: "", unit: "", scheduleTimes: "" });
    setShowModal(true);
  };

  const openEdit = (m: Medication) => {
    setEditing(m);
    setForm({ name: m.name, dosage: m.dosage, unit: m.unit, scheduleTimes: m.scheduleTimes.join(", ") });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const times = form.scheduleTimes.split(",").map((t) => t.trim()).filter(Boolean);
    try {
      if (editing) {
        await api.patch(`/medications/${editing.id}`, { name: form.name, dosage: form.dosage, unit: form.unit, scheduleTimes: times, active: true });
      } else {
        await api.post("/medications", { patientId: id, name: form.name, dosage: form.dosage, unit: form.unit, scheduleTimes: times });
      }
      setShowModal(false);
      fetchData();
      toast(editing ? "Obat berhasil diperbarui" : "Obat berhasil ditambahkan");
    } catch (err: any) {
      toast(err.response?.data?.message || "Gagal", "error");
    }
    setSubmitting(false);
  };

  const handleDeactivate = async (medId: string) => {
    if (!confirm("Nonaktifkan obat ini?")) return;
    await api.patch(`/medications/${medId}`, { active: false });
    fetchData();
    toast("Obat dinonaktifkan");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Obat {patient?.name || "..."}</h2>
          <p className="text-sm text-muted-foreground">Kelola jadwal pengobatan</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
          <Plus className="h-4 w-4" /> Tambah Obat
        </button>
      </div>

      <div className="space-y-3">
        {meds.filter((m) => m.active).length === 0 && (
          <p className="text-sm text-muted-foreground">Belum ada obat</p>
        )}
        {meds.filter((m) => m.active).map((m) => (
          <div key={m.id} className="flex items-start justify-between rounded-lg border p-4">
            <div>
              <p className="font-medium">{m.name} {m.dosage} {m.unit}</p>
              <p className="text-sm text-muted-foreground">
                Jadwal: {m.scheduleTimes.join(", ")} WIB
              </p>
            </div>
            <div className="flex gap-1">
              <button onClick={() => openEdit(m)} className="rounded p-1 hover:bg-muted text-sm">Edit</button>
              <button onClick={() => handleDeactivate(m.id)} className="rounded p-1 hover:bg-muted text-red-500">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
        {meds.filter((m) => !m.active).length > 0 && (
          <details className="text-sm text-muted-foreground">
            <summary className="cursor-pointer">Nonaktif ({meds.filter((m) => !m.active).length})</summary>
            {meds.filter((m) => !m.active).map((m) => (
              <div key={m.id} className="mt-2 rounded border p-2 opacity-60">
                {m.name} {m.dosage} {m.unit}
              </div>
            ))}
          </details>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowModal(false)}>
          <div className="w-full max-w-md rounded-lg border bg-card p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">{editing ? "Edit Obat" : "Tambah Obat"}</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-sm font-medium">Nama Obat</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-md border px-3 py-2 text-sm" placeholder="Metformin" required />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-sm font-medium">Dosis</label>
                  <input type="text" value={form.dosage} onChange={(e) => setForm({ ...form, dosage: e.target.value })} className="w-full rounded-md border px-3 py-2 text-sm" placeholder="500mg" required />
                </div>
                <div className="flex-1">
                  <label className="text-sm font-medium">Satuan</label>
                  <input type="text" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="w-full rounded-md border px-3 py-2 text-sm" placeholder="tablet" required />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Jadwal (pisahkan dengan koma)</label>
                <input type="text" value={form.scheduleTimes} onChange={(e) => setForm({ ...form, scheduleTimes: e.target.value })} className="w-full rounded-md border px-3 py-2 text-sm" placeholder="08:00, 20:00" required />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 rounded-md border px-4 py-2 text-sm">Batal</button>
                <button type="submit" disabled={submitting} className="flex-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">
                  {submitting ? "Menyimpan..." : editing ? "Simpan" : "Tambah"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
