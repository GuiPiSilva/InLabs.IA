import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useEffect, useState } from "react";
import { getAccessKey, setAccessKey, clearAccessKey, validateKey } from "@/lib/session";
import { toast } from "sonner";

export const Route = createFileRoute("/configuracoes")({
  head: () => ({ meta: [
    { title: "Configurações — InLabs.Ia Studios" },
    { name: "description", content: "Ajuste sua chave de acesso do InLabs.Ia Studios." },
    { property: "og:title", content: "Configurações — InLabs.Ia Studios" },
    { property: "og:description", content: "Preferências do estúdio." },
  ]}),
  component: Configs,
});

function Configs() {
  const nav = useNavigate();
  const [key, setKey] = useState("");
  useEffect(() => { setKey(getAccessKey() || ""); }, []);
  return (
    <AppShell>
      <div className="max-w-2xl mx-auto p-6 lg:p-10">
        <h1 className="text-3xl font-display font-bold mb-6">Configurações</h1>
        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <div>
            <label className="text-xs uppercase tracking-wide text-muted-foreground">Chave de acesso</label>
            <input value={key} onChange={e=>setKey(e.target.value)} type="password" className="mt-1 w-full bg-input rounded-lg p-3 text-sm"/>
          </div>
          <div className="flex gap-2">
            <button onClick={()=>{ if(!validateKey(key)){toast.error("Chave inválida");return;} setAccessKey(key); toast.success("Chave atualizada"); }}
              className="gradient-brand text-primary-foreground rounded-lg px-4 py-2 text-sm">Salvar</button>
            <button onClick={()=>{ clearAccessKey(); nav({ to: "/acesso" }); }} className="border border-border rounded-lg px-4 py-2 text-sm hover:bg-secondary">Sair</button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
