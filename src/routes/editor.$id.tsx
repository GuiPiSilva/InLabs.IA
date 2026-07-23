import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Editor } from "@/components/Editor";
import { useEffect, useMemo, useState } from "react";
import { getProject, upsertProject, type Project, type Slide } from "@/lib/storage";
import { Download, Plus, Trash2, Copy } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/editor/$id")({
  head: () => ({ meta: [
    { title: "Editor — InLabs.Ia Studios" },
    { name: "description", content: "Editor visual estilo Canva do InLabs.Ia Studios." },
    { property: "og:title", content: "Editor — InLabs.Ia Studios" },
    { property: "og:description", content: "Edite carrosséis e cartazes gerados por IA." },
  ]}),
  component: EditorPage,
});

function EditorPage() {
  const { id } = useParams({ from: "/editor/$id" });
  const nav = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const p = getProject(id);
    if (!p) { toast.error("Projeto não encontrado"); nav({ to: "/projetos" }); return; }
    setProject(p);
  }, [id, nav]);

  const slide = project?.slides[active];
  const key = useMemo(() => `${id}-${active}`, [id, active]);

  if (!project || !slide) return <AppShell><div className="p-10">Carregando...</div></AppShell>;

  function updateSlide(canvas: unknown, thumb: string) {
    if (!project) return;
    const slides = project.slides.slice();
    slides[active] = { ...slides[active], canvas, thumb };
    const next = { ...project, slides };
    setProject(next);
    upsertProject(next);
  }

  function addSlide() {
    if (!project) return;
    const base: Slide = { id: crypto.randomUUID(), width: slide!.width, height: slide!.height, canvas: { elements: [], background: "#111" } };
    const next = { ...project, slides: [...project.slides, base] };
    setProject(next); upsertProject(next); setActive(next.slides.length-1);
  }
  function dupSlide() {
    if (!project) return;
    const copy: Slide = { ...slide!, id: crypto.randomUUID() };
    const slides = [...project.slides]; slides.splice(active+1, 0, copy);
    const next = { ...project, slides }; setProject(next); upsertProject(next); setActive(active+1);
  }
  function delSlide() {
    if (!project || project.slides.length <= 1) { toast.error("Precisa ter pelo menos 1 slide"); return; }
    const slides = project.slides.filter((_,i)=>i!==active);
    const next = { ...project, slides }; setProject(next); upsertProject(next); setActive(Math.max(0, active-1));
  }
  function exportCurrent() {
    const canvas = document.querySelector<HTMLCanvasElement>(".upper-canvas") || document.querySelector<HTMLCanvasElement>("canvas");
    if (!canvas) { toast.error("Canvas indisponível"); return; }
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `${project?.name || "cartaz"}-${active+1}.png`;
    a.click();
  }

  return (
    <AppShell>
      <div className="h-[calc(100vh-56px)] lg:h-screen flex flex-col">
        <div className="px-4 py-2 border-b border-border grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 bg-card">
          <div className="min-w-0">
            <div className="text-xs text-muted-foreground uppercase">{project.type}</div>
            <input value={project.name} onChange={e=>{ const n={...project, name:e.target.value}; setProject(n); upsertProject(n); }}
              className="bg-transparent font-semibold outline-none text-sm md:text-base w-full truncate"/>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={exportCurrent} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md gradient-brand text-primary-foreground text-xs font-medium"><Download className="w-3 h-3"/>Exportar</button>
          </div>
        </div>

        <div className="flex-1 flex min-h-0">
          <div className="flex-1 min-w-0">
            <Editor key={key} width={slide.width} height={slide.height} initial={slide.canvas as any} onChange={updateSlide}/>
          </div>
        </div>

        {/* Slides strip */}
        {project.type === "carrossel" && (
          <div className="border-t border-border bg-card p-2 flex items-center gap-2 overflow-x-auto">
            {project.slides.map((s, i) => (
              <button key={s.id} onClick={()=>setActive(i)} className={`relative shrink-0 w-20 h-20 rounded border-2 ${i===active?"border-primary":"border-transparent"} bg-secondary overflow-hidden`}>
                {s.thumb ? <img src={s.thumb} className="w-full h-full object-cover"/> : <div className="grid place-items-center h-full text-[10px] text-muted-foreground">{i+1}</div>}
                <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] text-center">{String(i+1).padStart(2,"0")}</span>
              </button>
            ))}
            <button onClick={addSlide} className="shrink-0 w-20 h-20 rounded border-2 border-dashed border-border grid place-items-center hover:border-primary"><Plus className="w-4 h-4"/></button>
            <div className="ml-auto flex gap-1 shrink-0">
              <button onClick={dupSlide} className="p-2 rounded hover:bg-secondary" title="Duplicar slide"><Copy className="w-4 h-4"/></button>
              <button onClick={delSlide} className="p-2 rounded hover:bg-destructive/30 text-destructive" title="Excluir slide"><Trash2 className="w-4 h-4"/></button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
