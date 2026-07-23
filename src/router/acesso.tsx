import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { KeyRound, Loader2, ShieldCheck } from "lucide-react";
import logoFull from "@/assets/logo-full.png";
import { setAccessKey } from "@/lib/session";
import { verifyAccessKey } from "@/lib/access.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/acesso")({
  head: () => ({ meta: [
    { title: "Acesso — InLabs.Ia Studios" },
    { name: "description", content: "Entre no estúdio criativo InLabs.Ia Studios com sua chave de acesso." },
    { property: "og:title", content: "InLabs.Ia Studios — Acesso" },
    { property: "og:description", content: "Chave de acesso pessoal ao estúdio." },
  ]}),
  component: Access,
});

function Access() {
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();
  const verify = useServerFn(verifyAccessKey);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const res = await verify({ data: { key: key.trim() } });
      if (!res.ok) { toast.error("Chave inválida ou desativada."); return; }
      setAccessKey(key.trim());
      toast.success("Bem-vindo ao estúdio");
      nav({ to: "/" });
    } catch (err) {
      toast.error((err as Error).message || "Não foi possível validar.");
    } finally { setBusy(false); }
  }

  return (
    <div className="min-h-screen grid place-items-center px-4 relative overflow-hidden">
      <div className="absolute inset-0 -z-10 opacity-40" style={{
        background: "radial-gradient(600px circle at 20% 20%, oklch(0.4 0.2 305 / 0.5), transparent 60%), radial-gradient(600px circle at 80% 80%, oklch(0.4 0.2 190 / 0.4), transparent 60%)"
      }}/>
      <div className="w-full max-w-md bg-card border border-border rounded-2xl p-8 shadow-2xl">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="bg-white rounded-2xl px-5 py-3 shadow-lg inline-flex items-center justify-center w-full max-w-[260px] sm:max-w-[300px]">
            <img src={logoFull} alt="InLabs.Ai" className="h-10 sm:h-12 w-auto object-contain"/>
          </div>
          <div className="text-xs text-muted-foreground mt-3">Estúdio criativo para Instagram</div>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <label className="block">
            <span className="text-sm text-muted-foreground">Chave de acesso</span>
            <div className="mt-1 flex items-center gap-2 bg-input border border-border rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-primary">
              <KeyRound className="w-4 h-4 text-muted-foreground"/>
              <input value={key} onChange={e=>setKey(e.target.value)} type="text" placeholder="INL-XXXX-XXXX-XXXX"
                className="w-full bg-transparent outline-none text-sm tracking-wider"/>
            </div>
          </label>
          <button type="submit" disabled={busy}
            className="w-full gradient-brand text-primary-foreground font-medium rounded-lg py-2.5 hover:opacity-90 transition flex items-center justify-center gap-2 disabled:opacity-60">
            {busy ? <><Loader2 className="w-4 h-4 animate-spin"/> Validando...</> : "Entrar no estúdio"}
          </button>
          <p className="text-[11px] text-muted-foreground text-center">
            Não tem uma chave? Solicite ao administrador.
          </p>
          <a href="/admin" className="mt-2 text-[11px] text-muted-foreground hover:text-foreground flex items-center justify-center gap-1">
            <ShieldCheck className="w-3 h-3"/> Área do administrador
          </a>
        </form>
      </div>
      <div className="absolute bottom-4 text-xs text-muted-foreground">InLabs.Ia Studios</div>
    </div>
  );
}
