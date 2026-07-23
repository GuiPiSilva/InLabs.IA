import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Images, ImagePlus, FolderOpen, Library, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { loadProjects, type Project } from "@/lib/storage";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "Dashboard — InLabs.Ia Studios" },
    { name: "description", content: "Comece um novo carrossel ou cartaz no InLabs.Ia Studios." },
    { property: "og:title", content: "Dashboard — InLabs.Ia Studios" },
    { property: "og:description", content: "Painel do estúdio criativo InLabs.Ia Studios." },
  ]}),
  component: Dashboard,
});

function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  useEffect(() => { setProjects(loadProjects()); }, []);
  return (
    <AppShell>
      <div className="max-w-6xl mx-auto p-6 lg:p-10 space-y-8">
        <header>
          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground mb-2">
            <Sparkles className="w-3 h-3"/> Estúdio criativo
          </div>
          <h1 className="text-3xl lg:text-5xl font-display font-bold">
            Bem-vindo ao <span className="text-gradient-brand">InLabs.Ia Studios</span>
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">Crie carrosséis e cartazes prontos para o Instagram com IA e editor visual. Cada geração é única — layouts, composições e imagens sempre variam.</p>
        </header>

        <div className="grid md:grid-cols-2 gap-4">
          <QuickCard to="/carrossel" title="Novo Carrossel" desc="1 a 20 slides gerados com layouts aleatórios." icon={Images}/>
          <QuickCard to="/cartaz" title="Novo Cartaz" desc="Combine foto e IA para um cartaz único." icon={ImagePlus}/>
          <QuickCard to="/projetos" title="Meus Projetos" desc="Continue editando o que já criou." icon={FolderOpen}/>
          <QuickCard to="/biblioteca" title="Biblioteca" desc="Imagens, uploads e fontes favoritas." icon={Library}/>
        </div>

        <section>
          <h2 className="text-lg font-semibold mb-3">Recentes</h2>
          {projects.length === 0 ? (
            <div className="border border-dashed border-border rounded-xl p-8 text-center text-muted-foreground">
              Nenhum projeto ainda. Comece pelo <Link to="/carrossel" className="text-primary underline">Novo Carrossel</Link>.
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {projects.slice(0,8).map(p => (
                <Link key={p.id} to="/editor/$id" params={{ id: p.id }}
                  className="group block bg-card border border-border rounded-xl overflow-hidden hover:border-primary transition">
                  <div className="aspect-square bg-secondary grid place-items-center">
                    {p.slides[0]?.thumb ? <img src={p.slides[0].thumb} alt={p.name} className="w-full h-full object-cover"/> : <span className="text-muted-foreground text-xs">sem preview</span>}
                  </div>
                  <div className="p-2">
                    <div className="text-sm font-medium truncate">{p.name}</div>
                    <div className="text-[10px] text-muted-foreground uppercase">{p.type}</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function QuickCard({ to, title, desc, icon: Icon }: { to: string; title: string; desc: string; icon: React.ComponentType<{className?:string}> }) {
  return (
    <Link to={to} className="group relative bg-card border border-border rounded-xl p-5 hover:border-primary transition overflow-hidden">
      <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full gradient-brand opacity-0 group-hover:opacity-20 transition"/>
      <Icon className="w-8 h-8 text-primary mb-3"/>
      <div className="font-semibold text-lg">{title}</div>
      <div className="text-sm text-muted-foreground">{desc}</div>
    </Link>
  );
}
