import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useEffect, useState } from "react";
import { loadProjects, deleteProject, duplicateProject, type Project } from "@/lib/storage";
import { Copy, Trash2, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/projetos")({
  head: () => ({ meta: [
    { title: "Meus Projetos — InLabs.Ia Studios" },
    { name: "description", content: "Todos os seus carrosséis e cartazes criados no InLabs.Ia Studios." },
    { property: "og:title", content: "Meus Projetos — InLabs.Ia Studios" },
    { property: "og:description", content: "Gerencie seus projetos criativos." },
  ]}),
  component: MeusProjetos,
});

function MeusProjetos() {
  const [items, setItems] = useState<Project[]>([]);
  const nav = useNavigate();
  const refresh = () => setItems(loadProjects());
  useEffect(refresh, []);
  return (
    <AppShell>
      <div className="max-w-6xl mx-auto p-6 lg:p-10">
        <h1 className="text-3xl font-display font-bold mb-6">Meus Projetos</h1>
        {items.length === 0 ? (
          <div className="border border-dashed border-border rounded-xl p-10 text-center text-muted-foreground">
            Nada por aqui. Comece um <Link to="/carrossel" className="text-primary underline">carrossel</Link> ou <Link to="/cartaz" className="text-primary underline">cartaz</Link>.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {items.map(p => (
              <div key={p.id} className="bg-card border border-border rounded-xl overflow-hidden group">
                <Link to="/editor/$id" params={{ id: p.id }} className="block aspect-square bg-secondary">
                  {p.slides[0]?.thumb ? <img src={p.slides[0].thumb} className="w-full h-full object-cover"/> : <div className="grid place-items-center h-full text-xs text-muted-foreground">sem preview</div>}
                </Link>
                <div className="p-3 space-y-2">
                  <div className="text-sm font-medium truncate">{p.name}</div>
                  <div className="text-[10px] uppercase text-muted-foreground">{p.type} • {new Date(p.updatedAt).toLocaleDateString()}</div>
                  <div className="flex gap-1">
                    <button onClick={()=>nav({ to: "/editor/$id", params:{id:p.id}})} className="flex-1 p-1.5 text-xs rounded bg-secondary hover:bg-muted flex items-center justify-center gap-1"><ExternalLink className="w-3 h-3"/>Abrir</button>
                    <button onClick={()=>{ const c=duplicateProject(p.id); if(c){ toast.success("Duplicado"); refresh(); }}} className="p-1.5 rounded bg-secondary hover:bg-muted"><Copy className="w-3 h-3"/></button>
                    <button onClick={()=>{ if(confirm("Excluir?")){ deleteProject(p.id); refresh(); toast.success("Excluído"); }}} className="p-1.5 rounded bg-secondary hover:bg-destructive/30 text-destructive"><Trash2 className="w-3 h-3"/></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
