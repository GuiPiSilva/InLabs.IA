import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { LayoutDashboard, Images, ImagePlus, FolderOpen, Library, Settings, LogOut, Menu, X } from "lucide-react";
import { getAccessKey, clearAccessKey } from "@/lib/session";
import logoFull from "@/assets/logo-full.png";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/carrossel", label: "Novo Carrossel", icon: Images },
  { to: "/cartaz", label: "Novo Cartaz", icon: ImagePlus },
  { to: "/projetos", label: "Meus Projetos", icon: FolderOpen },
  { to: "/biblioteca", label: "Biblioteca", icon: Library },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const loc = useLocation();
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setAuthed(!!getAccessKey());
    setReady(true);
  }, [loc.pathname]);

  useEffect(() => { setOpen(false); }, [loc.pathname]);

  if (!ready) return null;
  if (!authed) {
    if (typeof window !== "undefined" && loc.pathname !== "/acesso") {
      navigate({ to: "/acesso" });
    }
    return null;
  }

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      {/* Sidebar */}
      <aside className={`fixed lg:sticky top-0 h-screen w-64 shrink-0 bg-sidebar border-r border-sidebar-border z-40 transition-transform ${open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        <div className="px-4 py-4 border-b border-sidebar-border">
          <img src={logoFull} alt="InLabs.Ai" className="w-full h-auto max-h-16 object-contain" />
        </div>
        <nav className="p-3 space-y-1">
          {NAV.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} activeOptions={{ exact: to === "/" }}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground hover:bg-secondary transition data-[status=active]:bg-secondary data-[status=active]:text-foreground">
              <Icon className="w-4 h-4" />{label}
            </Link>
          ))}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-sidebar-border">
          <button onClick={() => { clearAccessKey(); navigate({ to: "/acesso" }); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-secondary transition">
            <LogOut className="w-4 h-4" />Sair
          </button>
          <div className="text-[10px] text-muted-foreground text-center mt-2">InLabs.Ia Studios © 2026</div>
        </div>
      </aside>

      {open && <div className="fixed inset-0 bg-black/60 z-30 lg:hidden" onClick={() => setOpen(false)} />}

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-card sticky top-0 z-20">
          <button onClick={() => setOpen(true)} className="p-2 rounded-md hover:bg-secondary">
            {open ? <X className="w-5 h-5"/> : <Menu className="w-5 h-5" />}
          </button>
          <img src={logoFull} alt="InLabs.Ai" className="h-8 w-auto max-w-[60vw] object-contain" />
          <div className="w-9" />
        </header>
        <main className="flex-1 overflow-auto">{children}</main>
        <footer className="text-center text-xs text-muted-foreground py-4 border-t border-border">
          InLabs.Ia Studios — Estúdio criativo local
        </footer>
      </div>
    </div>
  );
}
