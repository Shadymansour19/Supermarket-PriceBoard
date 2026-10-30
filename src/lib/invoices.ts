import { supabase } from "./supabase";
import type { Invoice, InvoiceKind, PaymentMethod } from "../types/database";

/** Everything optional on an invoice: a free note, plus who it was for
 * (customer on a sale, supplier on a purchase), a reference such as the
 * supplier's invoice number, and how it was paid. Blank means "not given". */
export type InvoiceDetails = {
  note: string;
  party_name: string;
  party_phone: string;
  party_address: string;
  reference: string;
  payment_method: PaymentMethod | "";
};

export const EMPTY_DETAILS: InvoiceDetails = {
  note: "",
  party_name: "",
  party_phone: "",
  party_address: "",
  reference: "",
  payment_method: "",
};

/** `unit_price` only matters for a purchase (the supplier's unit cost); for
 * a sale the server picks the price itself and ignores it. */
export type InvoiceLineInput = { product_id: string; quantity: number; unit_price?: number };

/** Thrown by `recordInvoice` for the failures a cashier can fix at the
 * desk — carries which product tripped it so the UI can name it. */
export class InvoiceError extends Error {
  code: "insufficient_stock" | "fraction_not_allowed" | "product_not_found" | "not_authorized" | "details_unavailable";
  productId?: string;

  constructor(code: InvoiceError["code"], productId?: string) {
    super(code);
    this.code = code;
    this.productId = productId;
  }
}

/**
 * Records a sale (stock goes down) or a purchase/receipt (stock goes up,
 * and each line's unit price becomes the product's cost price) in one
 * atomic database step — `record_invoice` in 0009_cashier_stock.sql. The
 * server re-checks stock and fraction rules, so these are the real
 * guards; the form's own limits are only a convenience. For a sale the
 * server also sets each line's price (the lowest valid one, deals
 * included), so the returned total is the authoritative amount.
 */
export async function recordInvoice(
  kind: InvoiceKind,
  lines: InvoiceLineInput[],
  details: InvoiceDetails = EMPTY_DETAILS,
): Promise<{ id: string; total: number }> {
  const { note, ...party } = details;
  // The extra argument is only sent when something was filled in, so a
  // plain invoice behaves exactly as before.
  const hasParty = Object.values(party).some((value) => value.trim() !== "");
  const { data, error } = await supabase.rpc("record_invoice", {
    p_kind: kind,
    p_lines: lines,
    p_note: note.trim() || null,
    ...(hasParty ? { p_details: party } : {}),
  });
  if (error) {
    // PostgREST can't find the 4-argument function: the database hasn't had
    // 0011_invoice_details.sql applied yet, so details can't be stored.
    if (hasParty && error.code === "PGRST202") throw new InvoiceError("details_unavailable");
    const [code, productId] = error.message.split(":");
    if (
      code === "insufficient_stock" ||
      code === "fraction_not_allowed" ||
      code === "product_not_found" ||
      code === "not_authorized"
    ) {
      throw new InvoiceError(code, productId);
    }
    throw error;
  }
  return data as { id: string; total: number };
}

/** Admin only: undoes a mistaken invoice and puts stock back. Throws an
 * InvoiceError('insufficient_stock') if a purchase's goods were already sold. */
export async function voidInvoice(invoiceId: string): Promise<void> {
  const { error } = await supabase.rpc("void_invoice", { p_invoice_id: invoiceId });
  if (error) {
    const [code, productId] = error.message.split(":");
    if (code === "insufficient_stock") throw new InvoiceError(code, productId);
    throw error;
  }
}

/** Newest invoices first, with their lines. RLS decides the scope: an
 * admin gets everyone's, a cashier only their own. */
export async function fetchInvoices(limit = 50): Promise<Invoice[]> {
  const { data, error } = await supabase
    .from("invoices")
    .select("*, invoice_lines(*)")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as Invoice[];
}

/** One invoice with its lines, e.g. to print right after recording it. */
export async function fetchInvoice(id: string): Promise<Invoice> {
  const { data, error } = await supabase
    .from("invoices")
    .select("*, invoice_lines(*)")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as Invoice;
}
