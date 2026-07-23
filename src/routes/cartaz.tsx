import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useState } from "react";
import { toast } from "sonner";
import { generateCartaz, generateImage } from "@/lib/ai.functions";
import { useServerFn } from "@tanstack/react-start";
import { randomStyle, buildLayout } from "@/lib/layouts";
import { newProject, upsertProject } from "@/lib/storage";
import { Loader2, Sparkles, Wand2, Upload } from "lucide-react";

export const Route = createFileRoute("/cartaz")({
  head: () => ({ meta: [
    { title: "Novo Cartaz — InLabs.Ia Studios" },
    { name: "description", content: "Crie um cartaz de evento único com IA no InLabs.Ia Studios." },
    { property: "og:title", content: "Novo Cartaz — InLabs.Ia Studios" },
    { property: "og:description", content: "Cartazes com foto e IA, sempre com layout diferente." },
  ]}),
  component: NovoCartaz,
});

function NovoCartaz() {
  const nav = useNavigate();
  const genText = useServerFn(generateCartaz);
  const genImg = useServerFn(generateImage);
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState("evento");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [place, setPlace] = useState("");
  const [style, setStyle] = useState("moderno");
  const [extra, setExtra] = useState("");
  const [photo, setPhoto] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => setPhoto(r.result as string);
    r.readAsDataURL(f);
  }

  async function gerar() {
    if (!title.trim()) { toast.error("Informe o título do evento"); return; }
    setBusy(true);
    try {
      const seed = crypto.randomUUID();
      const s = await genText({ data: { title, kind, date, time, place, style, extra, seed } });
      let imageUrl = photo;
      if (!imageUrl) {
        try { imageUrl = (await genImg({ data: { prompt: s.imagePrompt, seed } })).dataUrl; } catch {}
      }
      const [W, H] = [1080, 1350];
      const st = randomStyle();
      const els = buildLayout(st.layout, { title: s.title, body: s.body, imageUrl, palette: st.palette, width: W, height: H, fonts: st.fonts });
      const p = newProject("cartaz", title, { style });
      p.slides = [{ id: crypto.randomUUID(), width: W, height: H, canvas: { elements: els, background: st.palette[0], fonts: st.fonts } }];
      upsertProject(p);
      toast.success("Cartaz criado!");
      nav({ to: "/editor/$id", params: { id: p.id } });
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto p-6 lg:p-10">
        <div className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground mb-2">
          <Sparkles className="w-3 h-3"/> Novo cartaz
        </div>
        <h1 className="text-3xl font-display font-bold mb-6">Dados do evento</h1>

        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <Field label="Título do evento">
            <input value={title} onChange={e=>setTitle(e.target.value)}
              className="w-full bg-input rounded-lg p-3 text-sm outline-none focus:ring-2 focus:ring-primary" placeholder="Ex: Culto de Louvor"/>
          </Field>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Field label="Tipo"><input value={kind} onChange={e=>setKind(e.target.value)} className="w-full bg-input rounded-lg p-2.5 text-sm"/></Field>
            <Field label="Data"><input value={date} onChange={e=>setDate(e.target.value)} placeholder="15/08" className="w-full bg-input rounded-lg p-2.5 text-sm"/></Field>
            <Field label="Hora"><input value={time} onChange={e=>setTime(e.target.value)} placeholder="20h" className="w-full bg-input rounded-lg p-2.5 text-sm"/></Field>
            <Field label="Local"><input value={place} onChange={e=>setPlace(e.target.value)} className="w-full bg-input rounded-lg p-2.5 text-sm"/></Field>
          </div>
          <Field label="Estilo visual">
            <select value={style} onChange={e=>setStyle(e.target.value)} className="w-full bg-input rounded-lg p-2.5 text-sm">
              {["moderno","minimalista","vibrante","dark","editorial","religioso","festivo","custom"].map(s=><option key={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Instruções extras">
            <input value={extra} onChange={e=>setExtra(e.target.value)} className="w-full bg-input rounded-lg p-3 text-sm outline-none"/>
          </Field>
          <Field label="Foto (opcional)">
            <label className="flex items-center gap-3 p-4 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary transition">
              <Upload className="w-5 h-5 text-muted-foreground"/>
              <span className="text-sm text-muted-foreground">{photo ? "Foto carregada — clique para trocar" : "Clique para enviar"}</span>
              <input type="file" accept="image/*" onChange={onFile} className="hidden"/>
              {photo && <img src={photo} className="ml-auto w-16 h-16 object-cover rounded"/>}
            </label>
          </Field>
          <button disabled={busy} onClick={gerar}
            className="w-full gradient-brand text-primary-foreground font-medium rounded-lg py-3 flex items-center justify-center gap-2 disabled:opacity-60">
            {busy ? <><Loader2 className="w-4 h-4 animate-spin"/> Gerando...</> : <><Wand2 className="w-4 h-4"/> Gerar cartaz</>}
          </button>
          <p className="text-[11px] text-muted-foreground text-center">Cada geração sorteia layout e composição — o mesmo evento nunca produz dois cartazes iguais.</p>
        </div>
      </div>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="text-xs text-muted-foreground uppercase tracking-wide">{label}</span><div className="mt-1">{children}</div></label>;
}
