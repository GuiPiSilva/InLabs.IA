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

interface GeminiGenerateResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
  error?: { message?: string };
}

interface PollinationsImageResponse {
  data?: Array<{
    b64_json?: string;
    url?: string;
  }>;
  error?: { message?: string } | string;
}

async function callChat(messages: { role: string; content: string }[]): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY não configurada no servidor.");

  const systemMessage = messages.find((message) => message.role === "system")?.content ?? "";
  const userMessages = messages
    .filter((message) => message.role !== "system")
    .map((message) => message.content)
    .join("\n\n");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);

  try {
    const model = process.env.GEMINI_TEXT_MODEL || "gemini-2.5-flash";
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: `${systemMessage}\nRetorne somente JSON válido, sem markdown.` }],
          },
          contents: [{ role: "user", parts: [{ text: userMessages }] }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.9,
          },
        }),
      },
    );

    const body = (await response.json()) as GeminiGenerateResponse;
    if (!response.ok) {
      throw new Error(body.error?.message || `Erro HTTP ${response.status}`);
    }

    const output = body.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || "")
      .join("")
      .trim();

    if (!output) throw new Error("Resposta vazia da Gemini.");
    return output;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/aborted|abort/i.test(message)) {
      throw new Error("A Gemini demorou demais para responder. Tente novamente.");
    }
    if (/429|quota|rate limit/i.test(message)) {
      throw new Error("Limite da Gemini API atingido. Tente novamente em instantes.");
    }
    if (/401|403|api.?key|permission|unauthorized|forbidden/i.test(message)) {
      throw new Error("Chave da Gemini inválida ou sem permissão.");
    }
    throw new Error(`Falha ao chamar a Gemini: ${message}`);
  } finally {
    clearTimeout(timeout);
  }
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

    const raw = await callChat([
      { role: "system", content: sys },
      { role: "user", content: user },
    ]);

    let parsed: { slides: SlideOut[] };
    try {
      parsed = JSON.parse(raw) as { slides: SlideOut[] };
    } catch {
      throw new Error("Resposta da IA inválida");
    }

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

    const raw = await callChat([
      { role: "system", content: sys },
      { role: "user", content: user },
    ]);

    try {
      return JSON.parse(raw) as SlideOut;
    } catch {
      throw new Error("Resposta da IA inválida");
    }
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

function stringSeedToNumber(seed: string): number {
  if (!seed) return Math.floor(Math.random() * 2_147_483_647);
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) || 1;
}

async function imageUrlToDataUrl(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Falha ao baixar imagem: HTTP ${response.status}`);
  const mimeType = response.headers.get("content-type") || "image/jpeg";
  const bytes = Buffer.from(await response.arrayBuffer());
  return `data:${mimeType};base64,${bytes.toString("base64")}`;
}

export const generateImage = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ImageInput.parse(d))
  .handler(async ({ data }): Promise<{ dataUrl: string }> => {
    const apiKey = process.env.POLLINATIONS_API_KEY;
    if (!apiKey) {
      throw new Error("POLLINATIONS_API_KEY não configurada no servidor.");
    }

    const hasText = (data.slideTitle || data.slideBody).trim().length > 0;
    const fullPrompt = hasText
      ? `Create one finished square Instagram advertising poster, full bleed, edge to edge, not a mockup and not a slide inside a frame.

Portuguese headline: "${data.slideTitle}".
${data.slideBody ? `Portuguese supporting copy: "${data.slideBody}".` : ""}

Professional cinematic photographic background. Typography composited directly over the image. High readability, correct Portuguese spelling, no extra words, no watermark, no border, no device frame.
Visual style: ${data.style || "cinematic editorial advertising poster"}.
Color palette: ${data.palette || "cohesive high contrast palette"}.
${data.brand ? `Small discreet brand name in a corner: "${data.brand}".` : ""}
Scene: ${data.prompt}.
Variation seed: ${data.seed}.`
      : `${data.prompt}. Professional cinematic square Instagram image, full bleed, edge to edge, no border, no mockup, no watermark. Variation seed: ${data.seed}.`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120_000);

    try {
      const model = process.env.POLLINATIONS_IMAGE_MODEL || "zimage";
      const response = await fetch("https://gen.pollinations.ai/v1/images/generations", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({
          model,
          prompt: fullPrompt,
          n: 1,
          size: "1024x1024",
          response_format: "b64_json",
          seed: stringSeedToNumber(data.seed),
        }),
      });

      const rawText = await response.text();
      let result: PollinationsImageResponse = {};
      try {
        result = JSON.parse(rawText) as PollinationsImageResponse;
      } catch {
        // Mantém o texto bruto para a mensagem de erro abaixo.
      }

      if (!response.ok) {
        const apiMessage =
          typeof result.error === "string"
            ? result.error
            : result.error?.message || rawText || `Erro HTTP ${response.status}`;
        throw new Error(apiMessage);
      }

      const image = result.data?.[0];
      if (image?.b64_json) {
        return { dataUrl: `data:image/jpeg;base64,${image.b64_json}` };
      }
      if (image?.url) {
        return { dataUrl: await imageUrlToDataUrl(image.url) };
      }

      throw new Error("A Pollinations não retornou a imagem.");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (/aborted|abort/i.test(message)) {
        throw new Error("A Pollinations demorou demais para gerar a imagem.");
      }
      if (/401|unauthorized|invalid.?key/i.test(message)) {
        throw new Error("Chave da Pollinations inválida.");
      }
      if (/402|payment|required|balance|pollen|credit/i.test(message)) {
        throw new Error("Saldo da Pollinations insuficiente para gerar a imagem.");
      }
      if (/429|rate limit/i.test(message)) {
        throw new Error("Limite de requisições da Pollinations atingido. Tente novamente.");
      }
      throw new Error(`Falha ao gerar imagem com a Pollinations: ${message}`);
    } finally {
      clearTimeout(timeout);
    }
  });
