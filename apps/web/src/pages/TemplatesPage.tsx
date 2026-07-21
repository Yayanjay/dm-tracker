import { useEffect, useState } from "react";
import api from "../lib/api";

interface Template {
  key: string;
  type: string;
  title: string;
  body: string;
  buttonLabels: string[];
}

const typeLabels: Record<string, string> = {
  enrollment: "Pendaftaran",
  reminder: "Pengingat",
  optin_confirm: "Konfirmasi Setuju",
  usage_hint: "Bantuan",
  already_opted_in: "Sudah Terdaftar",
};

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selected, setSelected] = useState<Template | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ title: "", body: "", buttonLabels: "" });
  const [preview, setPreview] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchTemplates = async () => {
    try {
      const { data } = await api.post("/templates/list", {
        page: 1,
        size: 20,
        sort: [{ key: "key", direction: "ASC" }],
      });
      setTemplates(data.data);
    } catch {
      // ignore
    }
  };

  useEffect(() => { fetchTemplates(); }, []);

  const selectTemplate = async (t: Template) => {
    setSelected(t);
    setEditing(false);
    setPreview(null);
    setForm({ title: t.title, body: t.body, buttonLabels: t.buttonLabels.join(", ") });
  };

  const handleSave = async () => {
    if (!selected) return;
    setSubmitting(true);
    const labels = form.buttonLabels.split(",").map((l) => l.trim()).filter(Boolean);
    try {
      await api.patch(`/templates/${selected.key}`, { title: form.title, body: form.body, buttonLabels: labels });
      await fetchTemplates();
      setEditing(false);
      alert("Template disimpan");
    } catch (err: any) {
      alert(err.response?.data?.message || "Gagal menyimpan");
    }
    setSubmitting(false);
  };

  const handlePreview = async () => {
    if (!selected) return;
    try {
      const { data } = await api.post("/templates/preview", {
        key: selected.key,
        variables: { name: "Budi", medication_name: "Metformin", dosage: "500mg", unit: "tablet" },
      });
      setPreview(data.data);
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Template Pesan</h2>

      <div className="grid grid-cols-5 gap-4">
        <div className="col-span-2 space-y-1 rounded-lg border p-2">
          {templates.map((t) => (
            <button
              key={t.key}
              onClick={() => selectTemplate(t)}
              className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${
                selected?.key === t.key ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              }`}
            >
              <p className="font-medium">{typeLabels[t.type] || t.type}</p>
              <p className="text-xs opacity-70">{t.key}</p>
            </button>
          ))}
        </div>

        <div className="col-span-3 space-y-3">
          {selected && (
            <>
              <div className="flex items-center justify-between">
                <h3 className="font-bold">{typeLabels[selected.type] || selected.type}</h3>
                <div className="flex gap-2">
                  {!editing ? (
                    <button onClick={() => setEditing(true)} className="rounded-md bg-primary px-3 py-1 text-sm text-primary-foreground">Edit</button>
                  ) : (
                    <>
                      <button onClick={() => { setEditing(false); setForm({ title: selected.title, body: selected.body, buttonLabels: selected.buttonLabels.join(", ") }); }} className="rounded-md border px-3 py-1 text-sm">Batal</button>
                      <button onClick={handleSave} disabled={submitting} className="rounded-md bg-primary px-3 py-1 text-sm text-primary-foreground disabled:opacity-50">
                        {submitting ? "Menyimpan..." : "Simpan"}
                      </button>
                    </>
                  )}
                  <button onClick={handlePreview} className="rounded-md border px-3 py-1 text-sm">Preview</button>
                </div>
              </div>

              {editing ? (
                <div className="space-y-2">
                  <div>
                    <label className="text-xs font-medium">Judul</label>
                    <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full rounded-md border px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-medium">Isi (gunakan {"{{name}}"}, {"{{medication_name}}"}, dsb)</label>
                    <textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} rows={5} className="w-full rounded-md border px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-medium">Tombol (pisahkan dengan koma)</label>
                    <input type="text" value={form.buttonLabels} onChange={(e) => setForm({ ...form, buttonLabels: e.target.value })} className="w-full rounded-md border px-3 py-2 text-sm" placeholder="Sudah minum, Belum" />
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                  <p className="text-xs text-muted-foreground">Preview:</p>
                  <div className="rounded border bg-card p-3 text-sm whitespace-pre-wrap">
                    {preview ? (
                      <>
                        <p className="font-bold mb-1">{preview.title}</p>
                        <p>{preview.body}</p>
                        {preview.buttonLabels.length > 0 && (
                          <div className="flex gap-1 mt-2">
                            {preview.buttonLabels.map((l: string, i: number) => (
                              <span key={i} className="rounded bg-primary/10 px-2 py-0.5 text-xs">{l}</span>
                            ))}
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <p className="font-bold mb-1">{selected.title}</p>
                        <p className="text-muted-foreground">{selected.body}</p>
                        {selected.buttonLabels.length > 0 && (
                          <div className="flex gap-1 mt-2">
                            {selected.buttonLabels.map((l, i) => (
                              <span key={i} className="rounded bg-primary/10 px-2 py-0.5 text-xs">{l}</span>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
