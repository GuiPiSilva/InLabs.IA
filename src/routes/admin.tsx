import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ShieldCheck, Loader2, Plus, Trash2, Copy, Check, KeyRound, LogOut, Power } from "lucide-react";
import logoIcon from "@/assets/logo-icon.png";
import {
  adminLogin, adminListKeys, adminCreateKey, adminToggleKey, adminDeleteKey,
} from "@/lib/access.functions";
import { getAdminToken, setAdminToken, clearAdminToken } from "@/lib/session";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [
    { title: "Admin — InLabs.Ia Studios" },
    { name: "description", content: "Painel do administrador: gere e gerencie chaves de acesso do estúdio." },
    { property: "og:title", content: "Admin — InLabs.Ia Studios" },
    { property: "og:description", content: "Gerencie chaves de acesso." },
  ]}),
  component: Admin,
});

type Row = {
  id: string; key: string; label: string | null; active: boolean;
  uses: number; last_used_at: string | null; created_at: string;
};

function Admin() {
  const [hydrated, setHydrated] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  useEffect(() => { setToken(getAdminToken()); setHydrated(true); }, []);
  if (!hydrated) return null;
  return (
    <div translate="no">
      {token
        ? <Panel token={token} onLogout={()=>{clearAdminToken(); setToken(null);}} />
        : <Login onOk={t=>{setAdminToken(t); setToken(t);}}/>}
    </div>
  );
}

function Login({ onOk }: { onOk: (t: string) => void }) {
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const login = useServerFn(adminLogin);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); if (busy) return; setBusy(true);
    try { await login({ data: { password: pw } }); onOk(pw); }
    catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  }
  return (
    <div className="min-h-screen grid place-items-center px-4">
      <form onSubmit={submit} className="w-full max-w-md bg-card border border-border rounded-2xl p-8 space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl gradient-brand grid place-items-center">
            <ShieldCheck className="w-6 h-6 text-primary-foreground"/>
          </div>
          <div>
            <div className="font-display text-xl font-bold">Área do administrador</div>
            <div className="text-xs text-muted-foreground">Gerencie chaves de acesso</div>
          </div>
        </div>
        <label className="block">
          <span className="text-sm text-muted-foreground">Senha admin</span>
          <input type="password" value={pw} onChange={e=>setPw(e.target.value)} required
            className="mt-1 w-full bg-input rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-primary"/>
        </label>
        <button disabled={busy}
          className="w-full gradient-brand text-primary-foreground font-medium rounded-lg py-2.5 flex items-center justify-center gap-2 disabled:opacity-60">
          {busy ? <Loader2 className="w-4 h-4 animate-spin"/> : null} Entrar
        </button>
      </form>
    </div>
  );
}

function Panel({ token, onLogout }: { token: string; onLogout: () => void }) {
  const list = useServerFn(adminListKeys);
  const create = useServerFn(adminCreateKey);
  const toggle = useServerFn(adminToggleKey);
  const del = useServerFn(adminDeleteKey);

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [label, setLabel] = useState("");
  const [creating, setCreating] = useState(false);

  async function refresh() {
    setLoading(true);
    try { const r = await list({ data: { token } }); setRows(r as Row[]); }
    catch (e) {
      toast.error((e as Error).message);
      if (String((e as Error).message).includes("inválida")) onLogout();
    }
    finally { setLoading(false); }
  }
  useEffect(() => { refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  async function doCreate(e: React.FormEvent) {
    e.preventDefault(); if (creating) return; setCreating(true);
    try {
      const row = await create({ data: { token, label } });
      setRows(r => [row as Row, ...r]); setLabel("");
      toast.success("Chave criada. Copie e envie ao usuário.");
    } catch (e) { toast.error((e as Error).message); }
    finally { setCreating(false); }
  }

  async function doToggle(row: Row) {
    try {
      await toggle({ data: { token, id: row.id, active: !row.active } });
      setRows(rs => rs.map(r => r.id === row.id ? { ...r, active: !r.active } : r));
    } catch (e) { toast.error((e as Error).message); }
  }

  async function doDelete(row: Row) {
    if (!confirm(`Excluir a chave ${row.key}?`)) return;
    try {
      await del({ data: { token, id: row.id } });
      setRows(rs => rs.filter(r => r.id !== row.id));
    } catch (e) { toast.error((e as Error).message); }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={logoIcon} alt="InLabs.Ai" className="w-7 h-7 object-contain"/>
            <span className="font-display font-bold">Admin • InLabs.Ai</span>
          </div>
          <button onClick={onLogout} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
            <LogOut className="w-3 h-3"/> Sair
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto p-6 lg:p-10 space-y-6">
        <div className="bg-card border border-border rounded-2xl p-6">
          <h1 className="text-xl font-display font-bold mb-1">Chaves de acesso</h1>
          <p className="text-sm text-muted-foreground mb-4">Gere uma chave e envie-a ao usuário. Só quem tem chave ativa consegue gerar carrosséis.</p>
          <form onSubmit={doCreate} className="flex flex-col sm:flex-row gap-2">
            <input value={label} onChange={e=>setLabel(e.target.value)} placeholder="Rótulo (ex: cliente Maria)"
              className="flex-1 bg-input rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-primary"/>
            <button disabled={creating}
              className="gradient-brand text-primary-foreground font-medium rounded-lg px-4 py-2.5 flex items-center justify-center gap-2 disabled:opacity-60">
              {creating ? <Loader2 className="w-4 h-4 animate-spin"/> : <Plus className="w-4 h-4"/>} Gerar chave
            </button>
          </form>
        </div>

        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin inline mr-2"/>Carregando...</div>
          ) : rows.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">Nenhuma chave criada ainda.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-widest text-muted-foreground bg-secondary/50">
                <tr>
                  <th className="text-left px-4 py-3">Chave</th>
                  <th className="text-left px-4 py-3">Rótulo</th>
                  <th className="text-left px-4 py-3">Usos</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-right px-4 py-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="px-4 py-3 font-mono text-xs flex items-center gap-2">
                      <KeyRound className="w-3 h-3 text-muted-foreground"/>{r.key}
                      <CopyInline text={r.key}/>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{r.label || "—"}</td>
                    <td className="px-4 py-3">{r.uses}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${r.active ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                        {r.active ? "ativa" : "desativada"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={()=>doToggle(r)} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mr-3">
                        <Power className="w-3 h-3"/> {r.active ? "desativar" : "ativar"}
                      </button>
                      <button onClick={()=>doDelete(r)} className="text-xs text-destructive hover:opacity-80 inline-flex items-center gap-1">
                        <Trash2 className="w-3 h-3"/> excluir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function CopyInline({ text }: { text: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button type="button" onClick={async ()=>{ await navigator.clipboard.writeText(text); setOk(true); setTimeout(()=>setOk(false), 1200); }}
      className="text-muted-foreground hover:text-foreground">
      {ok ? <Check className="w-3 h-3"/> : <Copy className="w-3 h-3"/>}
    </button>
  );
}
