import { CONTACT } from "../config";
import { formatPrice, formatQuantity } from "./localize";
import type { Invoice } from "../types/database";

export type ReceiptPaper = "80" | "58" | "a4";

const PAPER_KEY = "hamada_receipt_paper";

export function readReceiptPaper(): ReceiptPaper {
  try {
    const stored = localStorage.getItem(PAPER_KEY);
    if (stored === "80" || stored === "58" || stored === "a4") return stored;
  } catch {
    // Storage can throw in private browsing — fall back to the default.
  }
  return "80";
}

export function saveReceiptPaper(paper: ReceiptPaper) {
  try {
    localStorage.setItem(PAPER_KEY, paper);
  } catch {
    // Best-effort — it just won't be remembered.
  }
}

export type ReceiptLabels = {
  storeName: string;
  title: string;
  invoiceNo: string;
  date: string;
  cashier: string;
  item: string;
  total: string;
  voided: string;
  thanks: string;
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

const PAPER_CSS: Record<ReceiptPaper, { page: string; font: number; logo: number }> = {
  // Thermal rolls: width is fixed, height is "as long as needed"; the
  // small margin keeps text off the roll's unprintable edges.
  "80": { page: "80mm auto; margin: 4mm 3mm", font: 12, logo: 56 },
  "58": { page: "58mm auto; margin: 3mm 2mm", font: 10, logo: 40 },
  a4: { page: "A4; margin: 18mm", font: 14, logo: 80 },
};

export function buildReceiptHtml(invoice: Invoice, labels: ReceiptLabels, lang: string, paper: ReceiptPaper): string {
  const css = PAPER_CSS[paper];
  const dir = lang === "ar" ? "rtl" : "ltr";
  const number = invoice.number !== undefined ? String(invoice.number) : invoice.id.slice(0, 8).toUpperCase();
  const lines = invoice.invoice_lines
    .map((line) => {
      const lineTotal = Math.round(line.quantity * line.unit_price * 100) / 100;
      return `<div class="line"><div class="name">${escapeHtml(line.product_name)}</div>
        <div class="row"><span>${formatQuantity(line.quantity, lang)} × ${formatPrice(line.unit_price, lang)}</span>
        <span>${formatPrice(lineTotal, lang)}</span></div></div>`;
    })
    .join("");

  return `<!doctype html>
<html lang="${lang}" dir="${dir}"><head><meta charset="utf-8"><title>${escapeHtml(labels.title)} ${number}</title>
<style>
  @page { size: ${css.page}; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: system-ui, "Segoe UI", Tahoma, Arial, sans-serif; font-size: ${css.font}px; color: #000; }
  .center { text-align: center; }
  /* Thermal printers are black-and-white: boosting contrast keeps the logo
   * from printing as a grey smudge. */
  img { height: ${css.logo}px; width: auto; filter: grayscale(1) contrast(1.6); }
  h1 { font-size: ${css.font + 4}px; margin: 4px 0 2px; }
  .muted { color: #333; font-size: ${css.font - 1}px; }
  hr { border: 0; border-top: 1px dashed #000; margin: 8px 0; }
  .row { display: flex; justify-content: space-between; gap: 8px; }
  .name { font-weight: 600; }
  .line { margin-bottom: 5px; }
  .total { font-size: ${css.font + 3}px; font-weight: 700; }
  .void { text-align: center; font-weight: 700; font-size: ${css.font + 6}px; border: 2px solid #000; padding: 2px; margin: 6px 0; }
</style></head>
<body>
  <div class="center">
    <img src="${location.origin}/logo.jpg" alt="">
    <h1>${escapeHtml(labels.storeName)}</h1>
    <div class="muted">${escapeHtml(CONTACT.address)}</div>
    <div class="muted" dir="ltr">${escapeHtml(CONTACT.phoneNumbers[0]?.display ?? "")}</div>
  </div>
  <hr>
  <div class="center"><strong>${escapeHtml(labels.title)}</strong></div>
  <div class="row muted"><span>${escapeHtml(labels.invoiceNo)}</span><span dir="ltr">#${number}</span></div>
  <div class="row muted"><span>${escapeHtml(labels.date)}</span><span>${new Date(invoice.created_at).toLocaleString(lang)}</span></div>
  ${invoice.cashier_name ? `<div class="row muted"><span>${escapeHtml(labels.cashier)}</span><span>${escapeHtml(invoice.cashier_name)}</span></div>` : ""}
  ${invoice.voided_at ? `<div class="void">${escapeHtml(labels.voided)}</div>` : ""}
  <hr>
  ${lines}
  <hr>
  <div class="row total"><span>${escapeHtml(labels.total)}</span><span>${formatPrice(invoice.total, lang)}</span></div>
  ${invoice.note ? `<div class="muted" style="margin-top:6px">${escapeHtml(invoice.note)}</div>` : ""}
  <hr>
  <div class="center muted">${escapeHtml(labels.thanks)}</div>
</body></html>`;
}

/**
 * Prints an invoice as a receipt through the browser's print dialog — so it
 * works with any printer the computer has, thermal receipt printers
 * included. Rendered in a throwaway hidden iframe with its own stylesheet,
 * so the app's styles (and the rest of the page) never leak into the print.
 */
export async function printInvoice(invoice: Invoice, labels: ReceiptLabels, lang: string, paper: ReceiptPaper) {
  const iframe = document.createElement("iframe");
  // Not display:none — some browsers print a blank page from a hidden frame.
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:1px;height:1px;border:0;opacity:0;";
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  const win = iframe.contentWindow;
  if (!doc || !win) {
    iframe.remove();
    return;
  }
  doc.open();
  doc.write(buildReceiptHtml(invoice, labels, lang, paper));
  doc.close();

  // Wait for the logo (or give up after a moment) so it's in the print.
  const logo = doc.querySelector("img");
  if (logo && !logo.complete) {
    await new Promise<void>((resolve) => {
      logo.onload = logo.onerror = () => resolve();
      setTimeout(resolve, 1500);
    });
  }

  const cleanup = () => iframe.remove();
  win.onafterprint = cleanup;
  setTimeout(cleanup, 120_000);
  win.focus();
  win.print();
}
