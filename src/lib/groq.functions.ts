import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function admin() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

const Input = z.object({
  accessKey: z.string().trim().min(4).max(64),
  tema: z.string().trim().min(3).max(500),
  objetivo: z.string().trim().max(300).optional().default(""),
  publicoAlvo: z.string().trim().max(300).optional().default(""),
  tom: z.string().trim().max(100).optional().default("profissional"),
  quantidadeSlides: z.number().int().min(1).max(20),
  informacoesAdicionais: z.string().trim().max(1000).optional().default(""),
});

interface SlideOut {
  numero: number;
  titulo: string;
  texto: string;
  promptImagem: string;
  tipo: string;
}
export interface CarrosselOut {
  id: string;
  titulo: string;
  legenda: string;
  hashtags: string[];
  slides: SlideOut[];
}

const MAX_PER_DAY = 30;
const TIMEOUT_MS = 45_000;

async function requireKey(sb: ReturnType<typeof admin>, key: string) {
  const { data: row } = await sb.from("access_keys")
    .select("id, active").eq("key", key).maybeSingle();
  if (!row || !row.active) throw new Error("Chave de acesso inválida ou desativada. Peça uma nova ao admin.");
  return row.id as string;
}

export const generateInstagramContent = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }): Promise<CarrosselOut> => {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error("GROQ_API_KEY não configurada no servidor.");

    const sb = admin();
    const keyId = await requireKey(sb, data.accessKey);

    // Rate limit por chave
    const sinceIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count, error: countErr } = await sb
      .from("generations")
      .select("id", { count: "exact", head: true })
      .eq("access_key_id", keyId)
      .gte("created_at", sinceIso);
    if (countErr) throw new Error("Falha ao verificar limite de uso.");
    if ((count ?? 0) >= MAX_PER_DAY) {
      throw new Error(`Limite diário atingido (${MAX_PER_DAY} gerações) para esta chave.`);
    }

    const systemPrompt = `Você é um diretor de arte e redator especialista em conteúdo para Instagram, no nível de agências premiadas (referências: estúdios que usam metáfora visual conceitual — estátua clássica pensando, mão robótica cumprimentando, peça de xadrez quebrada, cérebro dentro de uma gaiola aberta, megafone, astronauta, multidão de pessoas de terno). NUNCA use fotos genéricas de "pessoa sorrindo no notebook" ou "equipe reunida numa mesa" — isso é proibido.
Retorne SEMPRE JSON válido, sem markdown, no formato EXATO:
{
  "titulo": "Título principal do carrossel",
  "legenda": "Legenda completa para Instagram, com quebras de linha e CTA no final",
  "hashtags": ["hashtag1", "hashtag2"],
  "slides": [
    { "numero": 1, "titulo": "Título do slide", "texto": "Texto do slide", "promptImagem": "Descrição detalhada da imagem em inglês", "tipo": "capa" }
  ]
}

REGRA CENTRAL — cada slide precisa ser visualmente diferente dos outros, como uma vitrine de peças de portfólio, nunca uma sequência repetitiva. Para isso, combine estes dois eixos, sorteando uma combinação distinta por slide:

EIXO 1 — formato do texto (varie entre os slides, não repita o mesmo formato sempre):
- "palavra-bomba": 1-3 palavras gigantes, o resto do texto é só um complemento curto.
- "pergunta/quiz": provoca o leitor com uma pergunta direta ou múltipla escolha.
- "checklist/lista numerada": 3-5 itens curtos com um ícone ou marcador.
- "afirmação de contraste": duas ideias opostas lado a lado (ex.: "Design barato sai caro").
- "estatística/dado": um número grande como protagonista.
- "citação/frase de efeito": frase curta e definitiva, quase um mantra.

EIXO 2 — metáfora visual do promptImagem (escolha uma categoria diferente por slide, em inglês, sempre como still de campanha publicitária, cinematográfico, alto contraste, nunca stock photo genérica):
- objeto 3D conceitual flutuando (troféu, engrenagem, ícone abstrato)
- estátua clássica / busto de mármore em contexto moderno (com laptop, óculos VR, headset)
- mão ou figura robótica fazendo um gesto humano (aperto de mão, segurando megafone, apontando)
- peças de xadrez em ação (rei caindo, peão avançando, tabuleiro quebrado)
- multidão de pessoas (vista de cima, ou uma pessoa se destacando das demais)
- animal ou objeto do dia a dia em situação inusitada e bem-humorada (ex.: gato gritando num megafone)
- cápsula do tempo / relógios / ampulheta para urgência
- jaula, cadeado ou porta se abrindo como metáfora de liberdade/limite
- astronauta, foguete ou espaço para inovação/exploração
- jornal, manchete ou prova social impressa

Regras adicionais:
- O primeiro slide tem tipo "capa", os intermediários "conteudo", o último "cta".
- Títulos curtos e impactantes (máx 8 palavras).
- Textos com 1-3 linhas cada.
- promptImagem sempre em inglês, cinematográfico, com ângulo/iluminação/composição únicos — nunca repita a mesma metáfora visual duas vezes no mesmo carrossel.
- Hashtags relevantes ao nicho, entre 8 e 15.
- Idioma dos textos: português brasileiro.`;

    const userPrompt = `Tema: ${data.tema}
Objetivo: ${data.objetivo || "engajamento"}
Público-alvo: ${data.publicoAlvo || "geral"}
Tom de comunicação: ${data.tom}
Quantidade de slides: ${data.quantidadeSlides}
Informações adicionais: ${data.informacoesAdicionais || "nenhuma"}`;

    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: process.env.GROQ_TEXT_MODEL || "llama-3.3-70b-versatile",
          temperature: 0.9,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        }),
      });
    } catch (e) {
      const err = e as Error;
      if (err.name === "AbortError") throw new Error("Tempo esgotado ao gerar. Tente novamente.");
      throw new Error("Falha ao chamar a Groq API.");
    } finally { clearTimeout(t); }

    if (!response.ok) {
      const body = await response.text();
      console.error("Groq error", response.status, body.slice(0, 500));
      if (response.status === 429) throw new Error("Limite da Groq API atingido. Tente novamente em instantes.");
      if (response.status === 401 || response.status === 403) throw new Error("Chave da Groq inválida ou sem permissão.");
      throw new Error("A Groq retornou um erro. Tente novamente.");
    }

    const json = await response.json() as { choices?: { message?: { content?: string } }[] };
    const raw = json.choices?.[0]?.message?.content ?? "";
    if (!raw) throw new Error("Resposta vazia da Groq.");
    let parsed: Omit<CarrosselOut, "id">;
    try { parsed = JSON.parse(raw) as Omit<CarrosselOut, "id">; }
    catch { throw new Error("Resposta da Groq em formato inválido."); }

    if (
      !parsed || typeof parsed.titulo !== "string" || typeof parsed.legenda !== "string" ||
      !Array.isArray(parsed.hashtags) || !Array.isArray(parsed.slides) || parsed.slides.length === 0
    ) throw new Error("Resposta da Groq não segue o formato esperado.");

    const slides = parsed.slides.slice(0, data.quantidadeSlides).map((s, i) => ({
      numero: i + 1,
      titulo: String(s.titulo ?? ""),
      texto: String(s.texto ?? ""),
      promptImagem: String(s.promptImagem ?? ""),
      tipo: String(s.tipo ?? (i === 0 ? "capa" : i === parsed.slides.length - 1 ? "cta" : "conteudo")),
    }));
    const hashtags = parsed.hashtags.map(h => String(h).replace(/^#/, "")).slice(0, 20);

    const { data: inserted, error: insErr } = await sb
      .from("generations")
      .insert({
        access_key_id: keyId,
        tema: data.tema,
        objetivo: data.objetivo,
        publico_alvo: data.publicoAlvo,
        tom: data.tom,
        quantidade_slides: data.quantidadeSlides,
        informacoes_adicionais: data.informacoesAdicionais,
        titulo: parsed.titulo,
        legenda: parsed.legenda,
        hashtags,
        slides,
      })
      .select("id")
      .single();
    if (insErr || !inserted) throw new Error("Falha ao salvar geração no banco.");

    await sb.from("access_keys")
      .update({ uses: (count ?? 0) + 1, last_used_at: new Date().toISOString() })
      .eq("id", keyId);

    return { id: inserted.id, titulo: parsed.titulo, legenda: parsed.legenda, hashtags, slides };
  });

const UpdateSlideInput = z.object({
  accessKey: z.string().trim().min(4).max(64),
  generationId: z.string().uuid(),
  slideNumero: z.number().int().min(1),
  titulo: z.string().max(300),
  texto: z.string().max(2000),
});

export const updateSlide = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => UpdateSlideInput.parse(d))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const sb = admin();
    await requireKey(sb, data.accessKey);
    const { data: row, error } = await sb
      .from("generations").select("slides").eq("id", data.generationId).single();
    if (error || !row) throw new Error("Geração não encontrada.");
    const slides = (row.slides as unknown as SlideOut[]).map(s =>
      s.numero === data.slideNumero ? { ...s, titulo: data.titulo, texto: data.texto } : s,
    );
    const { error: upErr } = await sb
      .from("generations").update({ slides: slides as unknown as never }).eq("id", data.generationId);
    if (upErr) throw new Error("Falha ao salvar edições.");
    return { ok: true };
  });

export const testGroqConnection = createServerFn({ method: "POST" })
  .handler(async (): Promise<{ ok: boolean; model: string; message: string }> => {
    const apiKey = process.env.GROQ_API_KEY;
    const model = process.env.GROQ_TEXT_MODEL || "llama-3.3-70b-versatile";
    if (!apiKey) return { ok: false, model, message: "GROQ_API_KEY não configurada no servidor." };
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 15_000);
    try {
      const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        signal: controller.signal,
        body: JSON.stringify({
          model,
          temperature: 0,
          max_tokens: 10,
          messages: [{ role: "user", content: "Responda apenas: OK" }],
        }),
      });
      if (!r.ok) {
        const body = await r.text();
        if (r.status === 401 || r.status === 403) return { ok: false, model, message: "Chave da Groq inválida ou sem permissão." };
        if (r.status === 429) return { ok: false, model, message: "Limite da Groq atingido no momento." };
        return { ok: false, model, message: `Erro Groq ${r.status}: ${body.slice(0, 160)}` };
      }
      const j = await r.json() as { choices?: { message?: { content?: string } }[] };
      const txt = j.choices?.[0]?.message?.content?.trim() ?? "";
      return { ok: true, model, message: `Conexão OK. Resposta: "${txt || "(vazia)"}"` };
    } catch (e) {
      const err = e as Error;
      if (err.name === "AbortError") return { ok: false, model, message: "Tempo esgotado ao contatar a Groq." };
      return { ok: false, model, message: "Falha de rede ao contatar a Groq." };
    } finally { clearTimeout(t); }
  });
