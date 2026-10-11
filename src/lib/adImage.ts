import { CONTACT } from "../config";
import i18n from "../i18n";
import type { LimitedTimeDiscount, Product, QuantityDiscount, QuantityDiscountTier } from "../types/database";
import { daysRemaining, discountPercent } from "./discounts";
import { productImageUrl } from "./supabase";

// Social-media ads for a single product, drawn on a canvas so no server is
// needed. Arabic only for now, written in Egyptian colloquial on purpose
// (it's an ad for local shoppers, not formal text). Three kinds, each with
// its own colors, headline and badge so they're recognizable at a glance.

export type AdSpec =
  | { kind: "new" }
  | { kind: "limited"; discount: LimitedTimeDiscount }
  | {
      kind: "quantity";
      discount: QuantityDiscount;
      /** Feature just this tier (a focused ad per tier); omit for all tiers. */
      tierId?: string;
    };

/** The tiers an ad should show: one if `tierId` is set, else all. */
function adTiers(spec: Extract<AdSpec, { kind: "quantity" }>): QuantityDiscountTier[] {
  const single = spec.tierId ? spec.discount.tiers.find((t) => t.id === spec.tierId) : undefined;
  return single ? [single] : spec.discount.tiers;
}

export const AD_WIDTH = 1080;
export const AD_HEIGHT = 1350;

const BODY = "Cairo, Tajawal, system-ui, sans-serif";
const body = (size: number, weight = 700) => `${weight} ${size}px ${BODY}`;
// Display faces: Rakkas = hand-lettered script lines, Cairo 900 = the giant
// poster name, Lalezar = bold price numerals.
const brush = (size: number) => `400 ${size}px Rakkas, Lalezar, ${BODY}`;
const block = (size: number) => `900 ${size}px ${BODY}`;
const numeral = (size: number) => `400 ${size}px Lalezar, ${BODY}`;

const arabicNumber = new Intl.NumberFormat("ar-EG", { maximumFractionDigits: 2 });
const num = (n: number) => arabicNumber.format(n);

/** Phone numbers inside RTL text get their digit groups reordered unless
 * isolated as left-to-right. */
const phones = () => CONTACT.phoneNumbers.map((p) => `\u2066${p.display}\u2069`);

/** "٥٠ جنيه" — whole amounts drop the ".00" that formatPrice would add. */
export function adPrice(price: number): string {
  return `${num(price)} جنيه`;
}

function unitLabel(product: Product): string {
  return product.unit === "each" ? "" : i18n.t(`unit.${product.unit}`, { lng: "ar" });
}

/** Arabic day counts: يوم / يومين / ٣-١٠ أيام / ١١+ يوم. */
function daysText(days: number): string {
  if (days <= 1) return "يوم واحد";
  if (days === 2) return "يومين";
  if (days <= 10) return `${num(days)} أيام`;
  return `${num(days)} يوم`;
}

function bestQuantityPercent(product: Product, tiers: QuantityDiscountTier[]): number {
  return Math.max(0, ...tiers.map((tier) => discountPercent(product.price, tier.price)));
}

const imageCache = new Map<string, Promise<HTMLImageElement>>();

/** Loads (and caches) an image; the modal re-renders on every zoom/pan
 * step, so reloading would make dragging sluggish. */
function loadImage(url: string): Promise<HTMLImageElement> {
  let cached = imageCache.get(url);
  if (!cached) {
    cached = fetchImage(url);
    imageCache.set(url, cached);
    cached.catch(() => imageCache.delete(url));
  }
  return cached;
}

async function fetchImage(url: string): Promise<HTMLImageElement> {
  // Fetched as a blob first so the canvas is never tainted by a
  // cross-origin image (which would make toBlob() throw).
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Image request failed: ${res.status}`);
  const objectUrl = URL.createObjectURL(await res.blob());
  try {
    const img = new Image();
    img.src = objectUrl;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(candidate).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** Largest font size (down to `min`) at which `text` fits `maxLines` lines. */
function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  fontFor: (size: number) => string,
  maxWidth: number,
  maxLines: number,
  max: number,
  min: number,
) {
  for (let size = max; size >= min; size -= 4) {
    ctx.font = fontFor(size);
    const lines = wrapLines(ctx, text, maxWidth);
    if (lines.length <= maxLines) return { size, lines };
  }
  ctx.font = fontFor(min);
  return { size: min, lines: wrapLines(ctx, text, maxWidth).slice(0, maxLines) };
}

type Ctx = CanvasRenderingContext2D;
type Assets = { logo: HTMLImageElement; photo: HTMLImageElement | null };

/** Fills the current clip with `img` scaled to cover (crops overflow). */
/** How the admin has zoomed/panned the product photo inside its circle.
 * `x`/`y` are the image centre's offset from the circle centre, in poster
 * pixels; they're clamped so the photo always covers the circle. */
export type PhotoAdjust = { zoom: number; x: number; y: number };
export const DEFAULT_PHOTO_ADJUST: PhotoAdjust = { zoom: 1, x: 0, y: 0 };

/** Fills the box with `img` scaled to cover (crops overflow), applying the
 * zoom/pan; returns the adjust actually used after clamping. */
function drawCover(
  ctx: Ctx,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  adjust: PhotoAdjust = DEFAULT_PHOTO_ADJUST,
): PhotoAdjust {
  const scale = Math.max(w / img.width, h / img.height) * adjust.zoom;
  const dw = img.width * scale;
  const dh = img.height * scale;
  const maxX = (dw - w) / 2;
  const maxY = (dh - h) / 2;
  const ox = Math.max(-maxX, Math.min(maxX, adjust.x));
  const oy = Math.max(-maxY, Math.min(maxY, adjust.y));
  ctx.drawImage(img, x + (w - dw) / 2 + ox, y + (h - dh) / 2 + oy, dw, dh);
  return { zoom: adjust.zoom, x: ox, y: oy };
}

function circlePhoto(ctx: Ctx, img: HTMLImageElement, cx: number, cy: number, r: number, adjust?: PhotoAdjust) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  const used = drawCover(ctx, img, cx - r, cy - r, r * 2, r * 2, adjust);
  ctx.restore();
  return used;
}

function dropShadow(ctx: Ctx, blur = 30, dy = 14, alpha = 0.4) {
  ctx.shadowColor = `rgba(0,0,0,${alpha})`;
  ctx.shadowBlur = blur;
  ctx.shadowOffsetY = dy;
}

// ---------------------------------------------------------------------------
// The ad poster. One template for every ad kind, modelled on the burger
// posters we used as references: near-black grainy background, a ragged
// brush-stroke colour field, a giant white product name under a script
// line, a round photo, a torn-paper price sticker, an icon row and a black
// brush "order now" button. Mirrored for right-to-left reading. Only the
// colour, script line, sticker and icon row change per kind.
// ---------------------------------------------------------------------------

type Theme = {
  accent: string;
  accentDark: string;
  onAccent: string;
  script: string;
};

const THEMES: Record<AdSpec["kind"], Theme> = {
  new: { accent: "#ffb300", accentDark: "#d98e00", onAccent: "#111111", script: "#ffdf70" },
  limited: { accent: "#e5322d", accentDark: "#b3231f", onAccent: "#ffffff", script: "#ffd23f" },
  quantity: { accent: "#14b87f", accentDark: "#0d8a60", onAccent: "#05140d", script: "#7ef0c0" },
};

function lcg(seed: number) {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

/** A rectangle whose edges wobble like a dry-brush stroke. */
function raggedRect(ctx: Ctx, x: number, y: number, w: number, h: number, jag: number, seed: number) {
  const rnd = lcg(seed);
  const step = 16;
  ctx.beginPath();
  ctx.moveTo(x, y + (rnd() - 0.5) * jag);
  for (let px = x; px <= x + w; px += step) ctx.lineTo(px, y + (rnd() - 0.5) * jag);
  for (let py = y; py <= y + h; py += step) ctx.lineTo(x + w + (rnd() - 0.5) * jag, py);
  for (let px = x + w; px >= x; px -= step) ctx.lineTo(px, y + h + (rnd() - 0.5) * jag);
  for (let py = y + h; py >= y; py -= step) ctx.lineTo(x + (rnd() - 0.5) * jag, py);
  ctx.closePath();
}

/** Point on a cubic Bézier. */
function bezier(t: number, p: number[][]): [number, number] {
  const u = 1 - t;
  const x = u * u * u * p[0][0] + 3 * u * u * t * p[1][0] + 3 * u * t * t * p[2][0] + t * t * t * p[3][0];
  const y = u * u * u * p[0][1] + 3 * u * u * t * p[1][1] + 3 * u * t * t * p[2][1] + t * t * t * p[3][1];
  return [x, y];
}

/** The border between the black field and the colour field: a strip down
 * the left edge that sweeps, in one smooth curve, into the poster's bottom. */
function borderPoints(): [number, number][] {
  const pts: [number, number][] = [];
  for (let y = 0; y <= 470; y += 10) pts.push([250 - y * 0.07 + Math.sin(y / 47) * 7 + Math.sin(y / 17) * 3, y]);
  const curve = [
    [pts[pts.length - 1][0], 470],
    [190, 640],
    [700, 690],
    [AD_WIDTH + 40, 830],
  ];
  for (let t = 0.02; t <= 1.0001; t += 0.02) pts.push(bezier(t, curve));
  return pts;
}

/** A tapered brush flick: fat in the middle, pointed at both ends. */
function flick(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, bow: number, width: number, color: string) {
  const mx = (x0 + x1) / 2 + bow;
  const my = (y0 + y1) / 2 - bow * 0.6;
  const dx = y1 - y0;
  const dy = x0 - x1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = (dx / len) * width;
  const ny = (dy / len) * width;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.quadraticCurveTo(mx + nx, my + ny, x1, y1);
  ctx.quadraticCurveTo(mx - nx * 0.4, my - ny * 0.4, x0, y0);
  ctx.fill();
}

function drawBackground(ctx: Ctx, theme: Theme) {
  ctx.fillStyle = "#0c0c0c";
  ctx.fillRect(0, 0, AD_WIDTH, AD_HEIGHT);
  const rnd = lcg(7);
  for (let i = 0; i < 900; i++) {
    ctx.fillStyle = `rgba(255,255,255,${0.02 + rnd() * 0.04})`;
    ctx.fillRect(rnd() * AD_WIDTH, rnd() * AD_HEIGHT, 1 + rnd() * 2, 1 + rnd() * 2);
  }
  const glow = ctx.createRadialGradient(580, 790, 40, 580, 790, 520);
  glow.addColorStop(0, "rgba(255,255,255,0.12)");
  glow.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, AD_WIDTH, AD_HEIGHT);

  const border = borderPoints();
  const fillField = (dx: number, dy: number, color: string) => {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(border[0][0] + dx, 0);
    for (const [x, y] of border) ctx.lineTo(x + dx, y + dy);
    ctx.lineTo(AD_WIDTH, AD_HEIGHT);
    ctx.lineTo(0, AD_HEIGHT);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  };
  // Darker offset copy underneath = the brush's thick wet edge.
  fillField(-16, -16, theme.accentDark);
  fillField(0, 0, theme.accent);

  // Dry-brush bristles along the border: thin streaks that spill a little
  // past the edge in the colour, and thin dark ones that cut back into it.
  const rnd2 = lcg(33);
  ctx.lineCap = "round";
  for (let i = 1; i < border.length - 1; i++) {
    const [x, y] = border[i];
    const [px, py] = border[i - 1];
    const [nx2, ny2] = border[i + 1];
    const tx = nx2 - px;
    const ty = ny2 - py;
    const tl = Math.hypot(tx, ty) || 1;
    // Outward normal (towards the black side): up/right of the stroke.
    const ox = ty / tl;
    const oy = -tx / tl;
    for (let k = 0; k < 3; k++) {
      if (rnd2() < 0.75) continue;
      const off = (rnd2() - 0.5) * 20;
      const sx = x + (tx / tl) * off;
      const sy = y + (ty / tl) * off;
      const len = 4 + rnd2() * 20;
      ctx.lineWidth = 1.5 + rnd2() * 3;
      ctx.strokeStyle = theme.accent;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + ox * len, sy + oy * len);
      ctx.stroke();
      if (rnd2() < 0.6) {
        ctx.strokeStyle = "rgba(12,12,12,0.45)";
        ctx.lineWidth = 1.5 + rnd2() * 2;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx - ox * (4 + rnd2() * 18), sy - oy * (4 + rnd2() * 18));
        ctx.stroke();
      }
    }
  }
  // Black brush flicks crossing the colour field, and a colour flick
  // crossing into the black — like the reference's loose strokes.
  flick(ctx, -20, 905, 330, 845, 18, 12, "#0c0c0c");
  flick(ctx, -20, 945, 250, 915, 10, 7, "#0c0c0c");
  flick(ctx, 760, 925, AD_WIDTH + 20, 835, -14, 12, "#0c0c0c");

  // Dry-brush streaks across the colour field.
  ctx.strokeStyle = "rgba(0,0,0,0.10)";
  ctx.lineWidth = 3;
  for (let i = 0; i < 40; i++) {
    const y = 980 + rnd2() * 370;
    ctx.beginPath();
    ctx.moveTo(rnd2() * 600, y);
    ctx.lineTo(500 + rnd2() * 580, y + (rnd2() - 0.5) * 30);
    ctx.stroke();
  }
  // Dot grid, top-left, like the reference.
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 5; c++) {
      ctx.beginPath();
      ctx.arc(40 + c * 22, 36 + r * 22, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/** Little spark ticks radiating from a point. */
function ticks(ctx: Ctx, x: number, y: number, angle: number, color: string, scale = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.strokeStyle = color;
  ctx.lineCap = "round";
  ctx.lineWidth = 5 * scale;
  for (const [a, l] of [
    [-0.5, 26],
    [0, 34],
    [0.5, 26],
  ]) {
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 14 * scale, Math.sin(a) * 14 * scale);
    ctx.lineTo(Math.cos(a) * l * scale, Math.sin(a) * l * scale);
    ctx.stroke();
  }
  ctx.restore();
}

/** Hand-drawn curly arrow (loop in the middle) ending in an arrowhead at
 * (x+dx, y+dy). Drawn in white, pointing roughly left. */
function curlyArrow(ctx: Ctx, x: number, y: number, flip = 1, color = "#ffffff") {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(flip, 1);
  ctx.strokeStyle = color;
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(-8, 38, -46, 62, -70, 40);
  ctx.bezierCurveTo(-92, 20, -66, -6, -52, 16);
  ctx.bezierCurveTo(-40, 38, -64, 78, -108, 74);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-84, 56);
  ctx.lineTo(-110, 74);
  ctx.lineTo(-80, 92);
  ctx.stroke();
  ctx.restore();
}

type IconKind = "star" | "clock" | "pin" | "tag" | "number";

function drawIcon(ctx: Ctx, kind: IconKind, cx: number, cy: number, theme: Theme, label?: string) {
  ctx.fillStyle = "#0c0c0c";
  ctx.beginPath();
  ctx.arc(cx, cy, 40, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = theme.accent;
  ctx.strokeStyle = theme.accent;
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  if (kind === "star") {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? 22 : 9;
      const a = (Math.PI * i) / 5 - Math.PI / 2;
      ctx.lineTo(cx + Math.cos(a) * r, cy + 2 + Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fill();
  } else if (kind === "clock") {
    ctx.beginPath();
    ctx.arc(cx, cy, 20, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx, cy - 12);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx + 10, cy + 6);
    ctx.stroke();
  } else if (kind === "pin") {
    ctx.beginPath();
    ctx.arc(cx, cy - 6, 15, Math.PI * 0.85, Math.PI * 0.15, false);
    ctx.lineTo(cx, cy + 24);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#0c0c0c";
    ctx.beginPath();
    ctx.arc(cx, cy - 6, 6, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === "tag") {
    ctx.beginPath();
    ctx.moveTo(cx - 20, cy - 4);
    ctx.lineTo(cx - 4, cy - 20);
    ctx.lineTo(cx + 20, cy - 20);
    ctx.lineTo(cx + 20, cy + 4);
    ctx.lineTo(cx + 4, cy + 20);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#0c0c0c";
    ctx.beginPath();
    ctx.arc(cx + 9, cy - 9, 4, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.font = numeral(46);
    ctx.textAlign = "center";
    ctx.fillText(label ?? "", cx, cy + 3);
  }
}

type Feature = { icon: IconKind; iconLabel?: string; line1: string; line2: string; strike?: boolean };

function features(product: Product, spec: AdSpec): Feature[] {
  const unit = unitLabel(product);
  switch (spec.kind) {
    case "new":
      return [
        { icon: "star", line1: "جديد", line2: "لسه واصل" },
        { icon: "pin", line1: "الدير - أجا", line2: "الدقهلية" },
        { icon: "tag", line1: "على الأصل", line2: "دور" },
      ];
    case "limited": {
      const days = daysRemaining(spec.discount.ends_at);
      return [
        {
          icon: "tag",
          line1: "السعر الجديد",
          line2: adPrice(spec.discount.new_price),
        },
        { icon: "tag", line1: "السعر قبل", line2: adPrice(product.price), strike: true },
        { icon: "clock", line1: "باقي", line2: days <= 1 ? "يوم واحد" : daysText(days) },
      ];
    }
    case "quantity":
      return adTiers(spec)
        .slice(0, 3)
        .map((tier) => ({
          icon: "number" as const,
          iconLabel: num(tier.min_quantity),
          line1: `من ${num(tier.min_quantity)} ${unit || "قطع"}`,
          line2: adPrice(tier.price),
        }));
  }
}

function drawPoster(ctx: Ctx, product: Product, spec: AdSpec, assets: Assets, adjust: PhotoAdjust): PhotoAdjust {
  const theme = THEMES[spec.kind];
  drawBackground(ctx, theme);
  const R = AD_WIDTH - 50; // right text edge

  // Brand, top right.
  ctx.save();
  ctx.beginPath();
  ctx.arc(R - 28, 56, 30, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(assets.logo, R - 58, 26, 60, 60);
  ctx.restore();
  ctx.textAlign = "right";
  ctx.fillStyle = "#ffffff";
  ctx.font = body(28, 800);
  ctx.fillText("سوبر ماركت حماده", R - 72, 56);

  // Script line, giant product name, brush underline, sub-line.
  const scriptLine = {
    new: "جديد عندنا يا باشا!",
    limited: "عرض لفترة محدودة!",
    quantity: "اشتري أكتر.. وفّر أكتر!",
  }[spec.kind];
  ctx.font = brush(68);
  ctx.fillStyle = theme.script;
  ctx.fillText(scriptLine, R, 140);
  ticks(ctx, R - ctx.measureText(scriptLine).width - 30, 112, 2.6, "#ffffff", 0.8);

  // Short names blow up to fill the space; two-line names stay smaller.
  ctx.font = block(112);
  const nameFit =
    ctx.measureText(product.name_ar).width <= 740
      ? fitText(ctx, product.name_ar, block, 740, 1, 130, 112)
      : fitText(ctx, product.name_ar, block, 740, 2, 104, 56);
  ctx.font = block(nameFit.size);
  const lh = nameFit.size * 1.08;
  const nameTop = 215 + (nameFit.lines.length === 1 ? lh / 2 : 0);
  ctx.save();
  dropShadow(ctx, 14, 6, 0.6);
  ctx.fillStyle = "#ffffff";
  nameFit.lines.forEach((l, i) => ctx.fillText(l, R, nameTop + i * lh + lh / 2));
  ctx.restore();

  const underY = nameTop + nameFit.lines.length * lh + 18;
  ctx.fillStyle = theme.script;
  raggedRect(ctx, R - 560, underY, 560, 9, 5, 3);
  ctx.fill();
  const sub = {
    new: "لسه واصل.. الحق اطلبه دلوقتي",
    limited: "الحق قبل ما يخلص!",
    quantity: "كل ما تزود الكمية، السعر بينزل",
  }[spec.kind];
  ctx.font = brush(46);
  ctx.fillStyle = "#ffffff";
  ctx.fillText(sub, R, underY + 52);

  // Round badge top-left (dashed ring, like the "quality" stamp).
  ctx.textAlign = "center";
  const bx = 150;
  const by = 330;
  ctx.fillStyle = "#0c0c0c";
  ctx.beginPath();
  ctx.arc(bx, by, 100, 0, Math.PI * 2);
  ctx.fill();
  ctx.setLineDash([12, 9]);
  ctx.lineWidth = 4;
  ctx.strokeStyle = theme.accent;
  ctx.beginPath();
  ctx.arc(bx, by, 86, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  const badge =
    spec.kind === "new"
      ? ["جديد", "لسه واصل"]
      : spec.kind === "limited"
        ? ["عرض", "محدود"]
        : ["السعر العادي", adPrice(product.price)];
  ctx.fillStyle = "#ffffff";
  ctx.font = block(spec.kind === "quantity" ? 28 : 46);
  ctx.fillText(badge[0], bx, by - 26);
  ctx.fillStyle = theme.accent;
  ctx.font = block(spec.kind === "quantity" ? 34 : 32);
  ctx.fillText(badge[1], bx, by + 28);
  ticks(ctx, bx + 120, by - 100, -0.9, "#ffffff", 0.8);

  // Photo.
  const pcx = 580;
  const pcy = 770;
  const pr = 222;
  ctx.save();
  ctx.shadowColor = theme.accent;
  ctx.shadowBlur = 60;
  ctx.fillStyle = "#0c0c0c";
  ctx.beginPath();
  ctx.arc(pcx, pcy, pr + 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  const usedAdjust = circlePhoto(ctx, assets.photo ?? assets.logo, pcx, pcy, pr, assets.photo ? adjust : undefined);
  ctx.lineWidth = 6;
  ctx.strokeStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(pcx, pcy, pr + 3, 0, Math.PI * 2);
  ctx.stroke();

  // Dashed orbit around the photo, a hand-written note and a curly arrow.
  ctx.save();
  ctx.setLineDash([10, 14]);
  ctx.strokeStyle = "rgba(255,255,255,0.55)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(pcx, pcy, pr + 30, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  const note = {
    new: ["جديد", "لذيذ", "جربه!"],
    limited: ["الحق", "العرض", "ده!"],
    quantity: ["اشتري", "أكتر", "وفّر!"],
  }[spec.kind];
  // Hand-written note on the right, with a curly arrow ending at the photo.
  ctx.textAlign = "right";
  ctx.font = brush(44);
  ctx.fillStyle = "#ffffff";
  note.forEach((w, i) => ctx.fillText(w, R - 5, 660 + i * 52));
  curlyArrow(ctx, 925, 835, 1, "#ffffff");
  ticks(ctx, 960, 625, -2.4, theme.script, 0.9);
  ctx.textAlign = "center";

  // Brush-stroke badge (the "best burger in town" style): a ragged blob in
  // the colour with a black offset shadow, a crown, and three centred lines
  // — "up to" / big percentage / "off". A new product shows its price in it.
  const unit = unitLabel(product);
  const percent =
    spec.kind === "limited"
      ? discountPercent(product.price, spec.discount.new_price)
      : spec.kind === "quantity"
        ? bestQuantityPercent(product, adTiers(spec))
        : 0;
  ctx.save();
  ctx.translate(175, 790);
  ctx.rotate(-0.07);
  ctx.fillStyle = "#0c0c0c";
  raggedRect(ctx, -125 + 7, -105 + 9, 250, 215, 16, 41);
  ctx.fill();
  ctx.fillStyle = theme.script;
  raggedRect(ctx, -125, -105, 250, 215, 16, 41);
  ctx.fill();
  // Dry-brush tails off both ends.
  ctx.strokeStyle = theme.script;
  ctx.lineCap = "round";
  for (const [dy, len, side] of [
    [-60, 18, -1],
    [30, 14, -1],
    [70, 46, 1],
    [10, 30, 1],
    [-40, 40, 1],
  ] as const) {
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(side * 120, dy);
    ctx.lineTo(side * (122 + len), dy + side * 4);
    ctx.stroke();
  }
  ctx.fillStyle = "#0c0c0c";
  ctx.font = block(32);
  ctx.fillText(percent > 0 ? "وفّر لحد" : "السعر", 0, -62);
  ctx.font = percent > 0 ? block(96) : numeral(104);
  ctx.fillText(percent > 0 ? `${num(percent)}٪` : num(product.price), 0, 8);
  ctx.font = block(percent > 0 ? 38 : 28);
  ctx.fillText(percent > 0 ? "خصم" : unit ? `جنيه / ${unit}` : "جنيه", 0, 74);
  // Crown above, outlined.
  ctx.strokeStyle = theme.script;
  ctx.lineWidth = 5;
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(-26, -112);
  ctx.lineTo(-30, -142);
  ctx.lineTo(-12, -128);
  ctx.lineTo(0, -150);
  ctx.lineTo(12, -128);
  ctx.lineTo(30, -142);
  ctx.lineTo(26, -112);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
  ticks(ctx, 330, 655, -0.8, theme.onAccent, 0.9);

  // Icon row on the colour field.
  const items = features(product, spec);
  const itemW = 330;
  const rowY = 1095;
  const groupW = items.length * itemW;
  const startRight = AD_WIDTH / 2 + groupW / 2;
  items.forEach((f, i) => {
    const right = startRight - i * itemW;
    drawIcon(ctx, f.icon, right - 50, rowY, theme, f.iconLabel);
    ctx.textAlign = "right";
    ctx.fillStyle = theme.onAccent;
    ctx.font = body(spec.kind === "quantity" ? 25 : 28, 800);
    ctx.fillText(f.line1, right - 100, rowY - 16);
    ctx.font = body(spec.kind === "quantity" ? 32 : 28, 900);
    ctx.fillText(f.line2, right - 100, rowY + 20);
    if (f.strike) {
      const w = ctx.measureText(f.line2).width;
      ctx.fillStyle = theme.onAccent;
      ctx.fillRect(right - 100 - w, rowY + 19, w, 4);
    }
    if (i < items.length - 1) {
      ctx.save();
      ctx.setLineDash([8, 8]);
      ctx.strokeStyle = "rgba(0,0,0,0.4)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(right - itemW + 8, rowY - 40);
      ctx.lineTo(right - itemW + 8, rowY + 40);
      ctx.stroke();
      ctx.restore();
    }
  });

  // Black brush "order now" button + contact.
  ctx.textAlign = "center";
  ctx.save();
  dropShadow(ctx, 14, 6, 0.35);
  ctx.fillStyle = "#0c0c0c";
  raggedRect(ctx, AD_WIDTH / 2 - 250, 1160, 500, 84, 10, 17);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = "#ffffff";
  ctx.font = block(48);
  ctx.fillText("اطلب دلوقتي", AD_WIDTH / 2, 1204);
  ctx.strokeStyle = "#0c0c0c";
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  for (const side of [-1, 1]) {
    for (const [dy, len] of [
      [-18, 36],
      [0, 46],
      [18, 36],
    ]) {
      ctx.beginPath();
      ctx.moveTo(AD_WIDTH / 2 + side * 280, 1202 + dy);
      ctx.lineTo(AD_WIDTH / 2 + side * (280 + len), 1202 + dy * 1.3);
      ctx.stroke();
    }
  }
  ctx.fillStyle = theme.onAccent;
  ctx.font = body(34, 900);
  ctx.fillText(phones().join("   -   "), AD_WIDTH / 2, 1288);
  ctx.font = body(26, 700);
  ctx.fillText(`${CONTACT.address}  •  على الأصل دور`, AD_WIDTH / 2, 1328);
  return usedAdjust;
}

export async function renderProductAd(
  product: Product,
  spec: AdSpec,
  adjust: PhotoAdjust = DEFAULT_PHOTO_ADJUST,
): Promise<{ blob: Blob; adjust: PhotoAdjust }> {
  const sample = `${product.name_ar} جديد عندنا يا باشا عرض لفترة محدودة اشتري أكتر وفّر اطلب دلوقتي سوبر ماركت حماده ٠١٢٣٤٥٦٧٨٩٪`;
  await Promise.all(
    [brush(60), block(60), numeral(60), body(40, 800), body(40, 700)].map((f) => document.fonts.load(f, sample)),
  );

  const imageUrl = productImageUrl(product.image_path);
  const [logo, photo] = await Promise.all([
    loadImage("/logo.jpg"),
    imageUrl ? loadImage(imageUrl).catch(() => null) : Promise.resolve(null),
  ]);
  const assets: Assets = { logo, photo };

  const canvas = document.createElement("canvas");
  canvas.width = AD_WIDTH;
  canvas.height = AD_HEIGHT;
  const ctx = canvas.getContext("2d")!;
  ctx.direction = "rtl";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const used = drawPoster(ctx, product, spec, assets, adjust);

  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve({ blob, adjust: used }) : reject(new Error("Canvas export failed"))),
      "image/png",
    ),
  );
}

/** Ready-to-paste Egyptian-Arabic post text to go with the image. */
export function buildAdCaption(product: Product, spec: AdSpec): string {
  const name = [product.name_ar, product.size?.trim()].filter(Boolean).join(" ");
  const unit = unitLabel(product);
  const perUnit = unit ? ` لكل ${unit}` : "";
  let lines: string[];
  switch (spec.kind) {
    case "new":
      lines = [
        `🆕 جديد عندنا في سوبر ماركت حماده: ${name}`,
        `لسه واصل وبسعر ${adPrice(product.price)}${unit ? ` / ${unit}` : ""} بس! تعالى الحقه 🛒`,
      ];
      break;
    case "limited": {
      const percent = discountPercent(product.price, spec.discount.new_price);
      const days = daysRemaining(spec.discount.ends_at);
      lines = [
        `🔥 عرض لفترة محدودة! ${name}`,
        `بدل ${adPrice(product.price)} بقى بـ ${adPrice(spec.discount.new_price)}${perUnit} بس! وفّر ${num(percent)}٪`,
        days <= 1 ? "⏰ آخر يوم.. الحق قبل ما يخلص!" : `⏰ باقي ${daysText(days)} بس.. الحق قبل ما يخلص!`,
      ];
      break;
    }
    case "quantity":
      lines = [
        `💥 اشتري أكتر ووفّر أكتر! ${name}`,
        ...adTiers(spec).map((tier) => `✅ من ${num(tier.min_quantity)} بـ ${adPrice(tier.price)}${perUnit}`),
        `بدل ${adPrice(product.price)} للواحد.`,
      ];
      break;
  }
  return [
    ...lines,
    "",
    `🔗 شوف المنتج واطلبه أونلاين: ${window.location.origin}/product/${product.id}`,
    "",
    "على الأصل دور 🌟",
    `📍 ${CONTACT.address}`,
    `📞 اطلب دلوقتي: ${phones().join(" - ")}`,
  ].join("\n");
}
