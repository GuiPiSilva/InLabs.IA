import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useEffect, useState } from "react";
import { addLibrary, loadLibrary, removeLibrary, loadFavFonts, toggleFavFont, type LibItem } from "@/lib/storage";
import { Upload, Trash2, Search, Star } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/biblioteca")({
  head: () => ({ meta: [
    { title: "Biblioteca — InLabs.Ia Studios" },
    { name: "description", content: "Uploads, imagens e fontes favoritas do seu estúdio." },
    { property: "og:title", content: "Biblioteca — InLabs.Ia Studios" },
    { property: "og:description", content: "Assets criativos organizados." },
  ]}),
  component: Biblioteca,
});

const POPULAR_FONTS = ["Inter","Space Grotesk","Playfair Display","Bebas Neue","Archivo Black","Syne","DM Serif Display","Poppins","Montserrat","Lora","Oswald","Raleway","Cormorant Garamond","Anton","Righteous"];

function Biblioteca() {
  const [tab, setTab] = useState<"imagens"|"fontes">("imagens");
  const [items, setItems] = useState<LibItem[]>([]);
  const [favs, setFavs] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const refresh = () => { setItems(loadLibrary()); setFavs(loadFavFonts()); };
  useEffect(refresh, []);

  // Load Google Fonts CSS
  useEffect(() => {
    const id = "gf-preview";
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id; link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?" + POPULAR_FONTS.map(f=>`family=${encodeURIComponent(f)}:wght@400;700`).join("&") + "&display=swap";
    document.head.appendChild(link);
  }, []);

  function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files; if (!files) return;
    Array.from(files).forEach(f => {
      const r = new FileReader();
      r.onload = () => { addLibrary({ id: crypto.randomUUID(), url: r.result as string, name: f.name, addedAt: Date.now() }); refresh(); };
      r.readAsDataURL(f);
    });
    toast.success("Enviado à biblioteca");
  }

  const filtered = tab === "fontes" ? POPULAR_FONTS.filter(f=>f.toLowerCase().includes(q.toLowerCase())) : [];

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto p-6 lg:p-10">
        <h1 className="text-3xl font-display font-bold mb-6">Biblioteca</h1>
        <div className="flex gap-2 mb-4 border-b border-border">
          {(["imagens","fontes"] as const).map(t => (
            <button key={t} onClick={()=>setTab(t)} className={`px-4 py-2 text-sm capitalize ${tab===t?"border-b-2 border-primary text-foreground":"text-muted-foreground"}`}>{t}</button>
          ))}
        </div>

        {tab === "imagens" && (
          <>
            <div className="flex items-center gap-3 mb-4">
              <label className="flex-1 flex items-center gap-2 p-4 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary">
                <Upload className="w-5 h-5"/> <span className="text-sm">Enviar imagens</span>
                <input type="file" multiple accept="image/*" onChange={onUpload} className="hidden"/>
              </label>
            </div>
            {items.length === 0 ? <div className="text-muted-foreground text-sm">Nenhuma imagem ainda.</div> : (
              <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                {items.map(i => (
                  <div key={i.id} className="relative group bg-card border border-border rounded-lg overflow-hidden aspect-square">
                    <img src={i.url} className="w-full h-full object-cover"/>
                    <button onClick={()=>{ removeLibrary(i.id); refresh(); }} className="absolute top-1 right-1 p-1 rounded bg-black/60 opacity-0 group-hover:opacity-100 transition"><Trash2 className="w-3 h-3 text-white"/></button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {tab === "fontes" && (
          <>
            <div className="flex items-center gap-2 mb-4 bg-input rounded-lg px-3 py-2">
              <Search className="w-4 h-4 text-muted-foreground"/>
              <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar fonte Google..." className="w-full bg-transparent outline-none text-sm"/>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              {filtered.map(f => (
                <div key={f} className="bg-card border border-border rounded-lg p-4 flex items-center justify-between">
                  <div>
                    <div className="text-xs text-muted-foreground">{f}</div>
                    <div className="text-2xl" style={{ fontFamily: `"${f}", sans-serif` }}>Aa Bb Cc 123</div>
                  </div>
                  <button onClick={()=>{ toggleFavFont(f); refresh(); }} className={`p-2 rounded ${favs.includes(f)?"text-primary":"text-muted-foreground hover:text-foreground"}`}>
                    <Star className={`w-5 h-5 ${favs.includes(f)?"fill-current":""}`}/>
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
