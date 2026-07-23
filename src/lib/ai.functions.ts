import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const CarrosselInput = z.object({
  theme: z.string().min(1),
  reference: z.string().optional().default(""),
  style: z.string().optional().default(""),
  slides: z.number().int().min(1).max(20),
  extra: z.string().optional().default(""),
  seed: z.string().optional().default(""),
});

interface SlideOut {
  title: string;
  body: string;
  imagePrompt: string;
}

async function callChat(messages: { role: string; content: string }[]): Promise<string> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY não configurada");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3.6-flash",
      messages,
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    if (res.status === 429) throw new Error("Limite de uso atingido. Tente novamente em instantes.");
    if (res.status === 402) throw new Error("Créditos de IA esgotados. Adicione créditos na sua workspace.");
    throw new Error(`Falha na IA: ${t}`);
  }
  const j = await res.json() as { choices: { message: { content: string } }[] };
  return j.choices[0].message.content;
}

export const generateCarrossel = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => CarrosselInput.parse(d))
  .handler(async ({ data }): Promise<{ slides: SlideOut[] }> => {
    const sys = `Você é um redator especialista em Instagram. Retorne SEMPRE JSON válido no formato:
{ "slides": [ { "title": "...", "body": "...", "imagePrompt": "..." }, ... ] }
Regras: títulos curtos e impactantes, corpo em 1-2 linhas, imagePrompt em inglês descritivo com variações de ângulo/composição/iluminação únicas para cada slide (nunca repita a mesma composição). Idioma dos textos: português.`;
    const user = `Tema: ${data.theme}
Referência de estilo (só direção, não copiar): ${data.reference}
Estilo visual desejado: ${data.style}
Quantidade de slides: ${data.slides}
Instruções extras: ${data.extra}
Aleatoriedade (seed ${data.seed}): varie tom, exemplos e enquadramentos.`;

    const raw = await callChat([{ role: "system", content: sys }, { role: "user", content: user }]);
    let parsed: { slides: SlideOut[] };
    try { parsed = JSON.parse(raw); } catch { throw new Error("Resposta da IA inválida"); }
    if (!Array.isArray(parsed.slides)) throw new Error("Resposta sem slides");
    return { slides: parsed.slides.slice(0, data.slides) };
  });

const CartazInput = z.object({
  title: z.string(),
  date: z.string().optional().default(""),
  time: z.string().optional().default(""),
  place: z.string().optional().default(""),
  kind: z.string().optional().default(""),
  style: z.string().optional().default(""),
  extra: z.string().optional().default(""),
  seed: z.string().optional().default(""),
});

export const generateCartaz = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => CartazInput.parse(d))
  .handler(async ({ data }): Promise<SlideOut> => {
    const sys = `Você cria cartazes de eventos para Instagram. Retorne JSON: { "title": "...", "body": "...", "imagePrompt": "..." }. Body inclui data, hora e local formatados. imagePrompt em inglês, com composição/iluminação/ângulo únicos baseados na seed.`;
    const user = `Evento: ${data.title}
Tipo: ${data.kind}
Data: ${data.date} ${data.time}
Local: ${data.place}
Estilo: ${data.style}
Extras: ${data.extra}
Seed única: ${data.seed}`;
    const raw = await callChat([{ role: "system", content: sys }, { role: "user", content: user }]);
    return JSON.parse(raw) as SlideOut;
  });

const ImageInput = z.object({
  prompt: z.string().min(1),
  seed: z.string().optional().default(""),
  slideTitle: z.string().optional().default(""),
  slideBody: z.string().optional().default(""),
  slideIndex: z.number().optional().default(0),
  slideTotal: z.number().optional().default(0),
  slideKind: z.string().optional().default(""),
  brand: z.string().optional().default(""),
  palette: z.string().optional().default(""),
  style: z.string().optional().default(""),
});

export const generateImage = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ImageInput.parse(d))
  .handler(async ({ data }): Promise<{ dataUrl: string }> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY não configurada");

    const hasText = (data.slideTitle || data.slideBody).trim().length > 0;
    const fullPrompt = hasText
      ? `Create ONE single cinematic poster-style image (1:1, 1080x1080) — NOT a mockup, NOT a slide inside a frame, NOT a Canva/mLabs presentation preview, NOT a photo with a caption card next to it. The final result must look like a real finished advertising poster / editorial photograph where the typography is composited DIRECTLY over the photograph, edge-to-edge, with no white borders, no rounded card, no "slide X of Y" wrapper, no device frame.

RENDER THIS EXACT TEXT ON THE IMAGE (spelled correctly, in PORTUGUESE, no typos, no extra or invented words, no lorem ipsum):
- HEADLINE (very large, bold, dominant typography, can span multiple lines): "${data.slideTitle}"
${data.slideBody ? `- SUPPORTING COPY (smaller, clean sans-serif, secondary): "${data.slideBody}"` : ""}

DESIGN DIRECTION:
- Full-bleed photographic background of the subject (the product / scene itself), shot like a professional ad campaign: cinematic lighting, shallow depth of field, rich contrast, realistic textures.
- Typography sits ON TOP of the photo like a movie poster or magazine cover — huge display headline, elegant hierarchy, tasteful accent color or highlight only where needed for readability.
- Style reference: cinematic advertising poster, editorial magazine cover, luxury brand campaign. NOT a social media template with decorative shapes around a small photo.
- Visual style cue: ${data.style || "cinematic editorial poster"}
- Color palette: ${data.palette || "rich, cohesive, high-contrast between headline and background"}
${data.brand ? `- Small brand mark / handle discreetly placed in a corner: "${data.brand}"` : ""}

STRICT RULES:
- The image IS the final poster. No surrounding card, no frame, no slide number badge, no "1/10" indicator, no border, no page mockup.
- No gibberish letters, no duplicated text, no watermark.
- Square 1:1, full-bleed to the edges.

Photographic subject / scene: ${data.prompt}

Unique variation seed: ${data.seed}.`
      : `${data.prompt}. Cinematic full-bleed square 1:1 poster image, edge to edge, no frame, no slide mockup. Unique variation seed: ${data.seed}.`;


    const res = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3.1-flash-image",
        messages: [{ role: "user", content: fullPrompt }],
        modalities: ["image", "text"],
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      if (res.status === 429) throw new Error("Limite de uso atingido.");
      if (res.status === 402) throw new Error("Créditos de IA esgotados.");
      throw new Error(`Falha ao gerar imagem: ${t}`);
    }
    const j = await res.json() as { choices?: { message: { images?: { image_url: { url: string } }[] } }[]; data?: { b64_json: string }[] };
    if (j.data?.[0]?.b64_json) return { dataUrl: `data:image/png;base64,${j.data[0].b64_json}` };
    const url = j.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (url) return { dataUrl: url };
    throw new Error("Imagem não retornada pela IA");
  });
