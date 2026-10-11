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
// Badge faces, picked from the reference lettering: a rounded, friendly
// face for the label and a wide bubbly one for the price.
const badgeLabel = (size: number) => `800 ${size}px "Playpen Sans Arabic", ${BODY}`;
const badgePrice = (size: number) => `700 ${size}px Lemonada, ${BODY}`;
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
  /** Solid colour panel behind the headline (and the buttons/circles). */
  dark: string;
  /** Light field the photo sits on. */
  field: string;
  /** Text/lines on the light field. */
  ink: string;
  /** Highlight on the dark panel: script lines, underline, glyphs. */
  accent: string;
  /** Fill for the badges that sit on the light field — chosen per palette
   * so it harmonises with the field instead of clashing with it. */
  tag: string;
};

// Two-tone palettes in the style of the cold-coffee reference: one flat
// dark colour, one light field, one warm highlight.
const THEMES: Record<AdSpec["kind"], Theme> = {
  new: { dark: "#0f4a3a", field: "#a6dcbf", ink: "#0b3a2d", accent: "#f6b100", tag: "#ffeea8" },
  limited: { dark: "#7b1325", field: "#f4a3a0", ink: "#5e0e1c", accent: "#ffb703", tag: "#fff3ea" },
  quantity: { dark: "#11315f", field: "#a7c4ee", ink: "#0c2548", accent: "#ff9f1c", tag: "#fff6e3" },
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

/** The border between the dark panel and the light field: one smooth
 * S-curve — down the left side, then sweeping out to the right edge. */
function borderPoints(): [number, number][] {
  const pts: [number, number][] = [];
  const upper = [
    [390, 0],
    [390, 170],
    [200, 270],
    [235, 450],
  ];
  const lower = [
    [235, 450],
    [275, 640],
    [640, 802],
    [AD_WIDTH + 60, 1018],
  ];
  for (let t = 0; t <= 1.0001; t += 0.02) pts.push(bezier(t, upper));
  for (let t = 0.02; t <= 1.0001; t += 0.02) pts.push(bezier(t, lower));
  return pts;
}

/** Adds the light field's outline to the current path (no begin/fill). */
function lightFieldPath(ctx: Ctx) {
  const border = borderPoints();
  ctx.moveTo(0, 0);
  ctx.lineTo(border[0][0], 0);
  for (const [x, y] of border) ctx.lineTo(x, y);
  ctx.lineTo(AD_WIDTH, AD_HEIGHT);
  ctx.lineTo(0, AD_HEIGHT);
  ctx.closePath();
}

function drawBackground(ctx: Ctx, theme: Theme) {
  ctx.fillStyle = theme.dark;
  ctx.fillRect(0, 0, AD_WIDTH, AD_HEIGHT);
  ctx.beginPath();
  lightFieldPath(ctx);
  ctx.fillStyle = theme.field;
  ctx.fill();
  // Dot grid, top-left.
  ctx.fillStyle = `${theme.dark}66`;
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 5; c++) {
      ctx.beginPath();
      ctx.arc(40 + c * 22, 36 + r * 22, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function starburst(ctx: Ctx, cx: number, cy: number, outer: number, inner: number, points: number) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (Math.PI * i) / points - Math.PI / 2;
    ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  ctx.closePath();
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
  ctx.fillStyle = theme.dark;
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
    ctx.fillStyle = theme.dark;
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
    ctx.fillStyle = theme.dark;
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
        { icon: "star", line1: "تشكيلة", line2: "متجددة" },
        { icon: "pin", line1: "الدير - أجا", line2: "الدقهلية" },
        { icon: "tag", line1: "أسعار", line2: "تعجبك" },
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

/** Darkens a #rrggbb colour by `factor` (0..1). */
function shade(hex: string, factor: number): string {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.round(v * factor);
  return `rgb(${c((n >> 16) & 255)},${c((n >> 8) & 255)},${c(n & 255)})`;
}

/** An award-seal: ribbon tails, a finely scalloped rosette, a double ring
 * around a dark disc, and a ribbon banner across the middle carrying the
 * label over a big display-face line. */
function drawSeal(ctx: Ctx, theme: Theme, x: number, y: number, label: string, big: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.1);
  ctx.shadowColor = "rgba(0,0,0,0.35)";
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 8;

  // Ribbon tails, swallow-tailed, peeking out from under the rosette.
  const tail = theme.dark;
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.rotate(side * 0.28);
    ctx.fillStyle = tail;
    ctx.beginPath();
    ctx.moveTo(-26, 60);
    ctx.lineTo(26, 60);
    ctx.lineTo(26, 150);
    ctx.lineTo(0, 130);
    ctx.lineTo(-26, 150);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  ctx.shadowColor = "transparent";

  // Rosette + rings + disc.
  starburst(ctx, 0, 0, 118, 106, 34);
  ctx.fillStyle = theme.tag;
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(0, 0, 98, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = theme.tag;
  ctx.beginPath();
  ctx.arc(0, 0, 93, 0, Math.PI * 2);
  ctx.fill();
  const disc = ctx.createRadialGradient(0, -20, 10, 0, 0, 86);
  disc.addColorStop(0, shade(theme.dark, 1.5));
  disc.addColorStop(1, theme.dark);
  ctx.fillStyle = disc;
  ctx.beginPath();
  ctx.arc(0, 0, 86, 0, Math.PI * 2);
  ctx.fill();

  // Small star above the banner.
  ctx.fillStyle = theme.accent;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? 10 : 4;
    const a = (Math.PI * i) / 5 - Math.PI / 2;
    ctx.lineTo(Math.cos(a) * r, -64 + Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fill();

  // Banner across the middle: folded ends behind, swallow-tailed ribbon on top.
  const bw = 232;
  const bh = 48;
  const by = -40;
  ctx.fillStyle = tail;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(side * (bw / 2 - 12), by + bh);
    ctx.lineTo(side * (bw / 2 + 6), by + bh + 14);
    ctx.lineTo(side * (bw / 2 - 28), by + bh);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = theme.accent;
  ctx.beginPath();
  ctx.moveTo(-bw / 2, by);
  ctx.lineTo(bw / 2, by);
  ctx.lineTo(bw / 2 - 16, by + bh / 2);
  ctx.lineTo(bw / 2, by + bh);
  ctx.lineTo(-bw / 2, by + bh);
  ctx.lineTo(-bw / 2 + 16, by + bh / 2);
  ctx.closePath();
  ctx.fill();
  const fit = fitText(ctx, label, badgeLabel, bw - 56, 1, 34, 18);
  ctx.fillStyle = theme.dark;
  ctx.font = badgeLabel(fit.size);
  ctx.fillText(label, 0, by + bh / 2 + 3);

  // Big line under the banner.
  ctx.fillStyle = theme.accent;
  const bigFit = fitText(ctx, big, badgePrice, 130, 1, 40, 22);
  ctx.font = badgePrice(bigFit.size);
  ctx.fillText(big, 0, 40);
  ctx.restore();
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
    new: "لسه واصل عشانك!",
    limited: "عرض لفترة محدودة!",
    quantity: "اشتري أكتر.. وفّر أكتر!",
  }[spec.kind];
  ctx.font = brush(68);
  ctx.fillStyle = theme.accent;
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
  // Extruded shadow: stacked offset copies of the same words in black, so
  // the shadow follows each letter's shape.
  ctx.lineJoin = "round";
  ctx.lineWidth = 6;
  ctx.fillStyle = "#000000";
  ctx.strokeStyle = "#000000";
  const depth = 9;
  for (let d = depth; d >= 1; d--) {
    nameFit.lines.forEach((l, i) => {
      const y = nameTop + i * lh + lh / 2 + d;
      ctx.strokeText(l, R + d * 0.7, y);
      ctx.fillText(l, R + d * 0.7, y);
    });
  }
  // Soft dark drop under the whole stack.
  dropShadow(ctx, 20, depth + 8, 0.6);
  ctx.fillStyle = "#ffffff";
  nameFit.lines.forEach((l, i) => ctx.fillText(l, R, nameTop + i * lh + lh / 2));
  ctx.restore();

  const underY = nameTop + nameFit.lines.length * lh + 18;
  const sub = {
    new: "تعالى شوفه بنفسك",
    limited: "الحق قبل ما يخلص!",
    quantity: "كل ما تزود الكمية، السعر بينزل",
  }[spec.kind];
  // The underline is as long as the wider of the title (its longest line,
  // at the size it was fitted to) and the sentence below it (in its own font).
  ctx.font = block(nameFit.size);
  const titleWidth = Math.max(...nameFit.lines.map((l) => ctx.measureText(l).width));
  ctx.font = brush(46);
  const subWidth = ctx.measureText(sub).width;
  const underWidth = Math.min(740, Math.max(titleWidth, subWidth));
  ctx.fillStyle = theme.accent;
  raggedRect(ctx, R - underWidth, underY, underWidth, 9, 5, 3);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.fillText(sub, R, underY + 52);

  // Award-seal badge top-left.
  ctx.textAlign = "center";
  const badge =
    spec.kind === "new"
      ? ["وصل", "حالا"]
      : spec.kind === "limited"
        ? ["سعر", "خاص"]
        : ["السعر الأصلي", adPrice(product.price)];
  drawSeal(ctx, theme, 150, 330, badge[0], badge[1]);
  ticks(ctx, 275, 225, -0.9, "#ffffff", 0.8);

  // Photo.
  const pcx = 580;
  const pcy = 770;
  const pr = 222;
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.35)";
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 14;
  ctx.fillStyle = theme.dark;
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
    new: ["هتحبه", "من أول", "مرة!"],
    limited: ["متفوتش", "الفرصة", "دي!"],
    quantity: ["اشتري", "بسعر", "الجملة!"],
  }[spec.kind];
  // Hand-written note on the right, with a curly arrow ending at the photo.
  ctx.textAlign = "right";
  ctx.font = brush(44);
  ctx.fillStyle = "#ffffff";
  note.forEach((w, i) => ctx.fillText(w, R - 5, 688 + i * 52));
  // Two-tone arrow: white where it crosses the dark panel, dark where it
  // crosses the light field.
  ctx.save();
  ctx.beginPath();
  lightFieldPath(ctx);
  ctx.clip();
  curlyArrow(ctx, 925, 835, 1, theme.dark);
  ctx.restore();
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, AD_WIDTH, AD_HEIGHT);
  lightFieldPath(ctx);
  ctx.clip("evenodd");
  curlyArrow(ctx, 925, 835, 1, "#ffffff");
  ctx.restore();
  ticks(ctx, 960, 653, -2.4, theme.accent, 0.9);
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
  ctx.fillStyle = theme.dark;
  raggedRect(ctx, -125 + 7, -105 + 9, 250, 215, 16, 41);
  ctx.fill();
  ctx.fillStyle = theme.tag;
  raggedRect(ctx, -125, -105, 250, 215, 16, 41);
  ctx.fill();
  // Dry-brush tails off both ends.
  ctx.strokeStyle = theme.tag;
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
  ctx.fillStyle = theme.ink;
  ctx.font = block(32);
  ctx.fillText(percent > 0 ? "وفّر لحد" : "السعر", 0, -62);
  ctx.font = percent > 0 ? block(96) : numeral(104);
  ctx.fillText(percent > 0 ? `${num(percent)}٪` : num(product.price), 0, 8);
  ctx.font = block(percent > 0 ? 38 : 28);
  ctx.fillText(percent > 0 ? "خصم" : unit ? `جنيه / ${unit}` : "جنيه", 0, 74);
  // Crown above, outlined.
  ctx.strokeStyle = theme.ink;
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
  ticks(ctx, 330, 655, -0.8, theme.ink, 0.9);

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
    ctx.fillStyle = theme.ink;
    ctx.font = body(spec.kind === "quantity" ? 25 : 28, 800);
    ctx.fillText(f.line1, right - 100, rowY - 16);
    ctx.font = body(spec.kind === "quantity" ? 32 : 28, 900);
    ctx.fillText(f.line2, right - 100, rowY + 20);
    if (f.strike) {
      const w = ctx.measureText(f.line2).width;
      ctx.fillStyle = theme.ink;
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
  ctx.fillStyle = theme.dark;
  raggedRect(ctx, AD_WIDTH / 2 - 250, 1160, 500, 84, 10, 17);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = "#ffffff";
  ctx.font = block(48);
  ctx.fillText("اطلب دلوقتي", AD_WIDTH / 2, 1204);
  ctx.strokeStyle = theme.dark;
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
  ctx.fillStyle = theme.ink;
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
  const sample = `${product.name_ar} لسه واصل عشانك وصل حالا عرض لفترة محدودة اشتري أكتر وفّر اطلب دلوقتي سوبر ماركت حماده ٠١٢٣٤٥٦٧٨٩٪`;
  await Promise.all(
    [brush(60), block(60), numeral(60), badgeLabel(60), badgePrice(60), body(40, 800), body(40, 700)].map((f) =>
      document.fonts.load(f, sample),
    ),
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

/** Public page of the product — included in captions and Facebook shares. */
export function adProductUrl(product: Product): string {
  return `${window.location.origin}/product/${product.id}`;
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
    `🔗 شوف المنتج واطلبه أونلاين: ${adProductUrl(product)}`,
    "",
    "على الأصل دور 🌟",
    `📍 ${CONTACT.address}`,
    `📞 اطلب دلوقتي: ${phones().join(" - ")}`,
  ].join("\n");
}
