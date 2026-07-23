// Compõe o post final no navegador: pega a foto pura gerada pela IA
// (sem nenhum texto) e desenha o título/texto por cima usando Canvas 2D.
// Isso garante 100% de fidelidade da ortografia em português e elimina
// qualquer chance de a IA gerar molduras, cards ou badges de "slide X/Y".

export interface ComposePostOptions {
  background: string; // dataURL ou URL da foto pura (sem texto)
  title: string;
  body?: string;
  brand?: string;
  width?: number;
  height?: number;
  accentColor?: string;
}

export async function composePost(opts: ComposePostOptions): Promise<string> {
  const {
    background,
    title,
    body,
    brand,
    width = 1080,
    height = 1350,
    accentColor = "#facc15",
  } = opts;

  await ensureFontsLoaded();

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D não suportado neste navegador.");

  const img = await loadImage(background);
  drawImageCover(ctx, img, 0, 0, width, height);

  // Gradiente escuro só na parte de baixo, para o texto ficar legível
  // sem esconder a foto (igual a um pôster/capa de revista real).
  const gradient = ctx.createLinearGradient(0, height * 0.4, 0, height);
  gradient.addColorStop(0, "rgba(0,0,0,0)");
  gradient.addColorStop(1, "rgba(0,0,0,0.88)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  const padding = Math.round(width * 0.07);
  const maxTextWidth = width - padding * 2;

  let titleSize = Math.round(width * 0.095);
  ctx.textAlign = "left";
  ctx.font = `700 ${titleSize}px "Space Grotesk", sans-serif`;
  let titleLines = wrapText(ctx, title.toUpperCase(), maxTextWidth);
  while (titleLines.length > 3 && titleSize > width * 0.045) {
    titleSize -= 4;
    ctx.font = `700 ${titleSize}px "Space Grotesk", sans-serif`;
    titleLines = wrapText(ctx, title.toUpperCase(), maxTextWidth);
  }

  const bodySize = Math.round(width * 0.032);
  ctx.font = `400 ${bodySize}px "Inter", sans-serif`;
  const bodyLines = body ? wrapText(ctx, body, maxTextWidth) : [];

  const titleLineHeight = Math.round(titleSize * 1.08);
  const bodyLineHeight = Math.round(bodySize * 1.45);
  const accentH = Math.max(6, Math.round(width * 0.012));
  const gap = Math.round(titleSize * 0.4);

  const blockHeight =
    accentH + Math.round(titleSize * 0.35) +
    titleLines.length * titleLineHeight +
    (bodyLines.length ? gap + bodyLines.length * bodyLineHeight : 0);

  let cursorY = height - padding - blockHeight;

  ctx.fillStyle = accentColor;
  ctx.fillRect(padding, cursorY, Math.round(width * 0.14), accentH);
  cursorY += accentH + Math.round(titleSize * 0.55);

  ctx.fillStyle = "#ffffff";
  ctx.font = `700 ${titleSize}px "Space Grotesk", sans-serif`;
  for (const line of titleLines) {
    ctx.fillText(line, padding, cursorY);
    cursorY += titleLineHeight;
  }

  if (bodyLines.length) {
    cursorY += gap - Math.round(titleLineHeight * 0.5);
    ctx.font = `400 ${bodySize}px "Inter", sans-serif`;
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    for (const line of bodyLines) {
      ctx.fillText(line, padding, cursorY);
      cursorY += bodyLineHeight;
    }
  }

  if (brand) {
    ctx.font = `600 ${Math.round(width * 0.024)}px "Inter", sans-serif`;
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.fillText(brand, padding, padding + Math.round(width * 0.024));
  }

  return canvas.toDataURL("image/png");
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const w of words) {
    const test = current ? `${current} ${w}` : w;
    if (current && ctx.measureText(test).width > maxWidth) {
      lines.push(current);
      current = w;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Falha ao carregar a imagem base."));
    img.src = src;
  });
}

function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const imgRatio = img.width / img.height;
  const boxRatio = w / h;
  let sx = 0, sy = 0, sw = img.width, sh = img.height;
  if (imgRatio > boxRatio) {
    sw = img.height * boxRatio;
    sx = (img.width - sw) / 2;
  } else {
    sh = img.width / boxRatio;
    sy = (img.height - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

async function ensureFontsLoaded() {
  try {
    await Promise.all([
      document.fonts.load('700 60px "Space Grotesk"'),
      document.fonts.load('400 30px "Inter"'),
      document.fonts.load('600 30px "Inter"'),
    ]);
  } catch {
    // Se a fonte não carregar a tempo, o Canvas cai para a fonte padrão do sistema.
  }
}
