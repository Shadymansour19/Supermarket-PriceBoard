import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "./supabase";

export type Cashier = {
  id: string;
  display_name: string | null;
  email: string | null;
  created_at: string;
};

/** Failures the admin can act on; anything else surfaces as "server_error". */
export type StaffErrorCode =
  | "email_exists"
  | "weak_password"
  | "invalid_input"
  | "not_cashier"
  | "not_authorized"
  | "server_error";

export class StaffError extends Error {
  code: StaffErrorCode;

  constructor(code: StaffErrorCode) {
    super(code);
    this.code = code;
  }
}

/** Cashier accounts are managed by the `manage-cashiers` Edge Function —
 * creating logins needs the service-role key, which can't be in the
 * browser. The function re-verifies the caller is an admin. */
async function call<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("manage-cashiers", { body });
  if (error) {
    if (error instanceof FunctionsHttpError) {
      const payload = await error.context.json().catch(() => null);
      throw new StaffError((payload?.error as StaffErrorCode | undefined) ?? "server_error");
    }
    throw new StaffError("server_error");
  }
  return data as T;
}

export async function fetchCashiers(): Promise<Cashier[]> {
  return (await call<{ cashiers: Cashier[] }>({ action: "list" })).cashiers;
}

export async function createCashier(input: { email: string; password: string; display_name: string }): Promise<void> {
  await call({ action: "create", ...input });
}

export async function setCashierPassword(id: string, password: string): Promise<void> {
  await call({ action: "set_password", id, password });
}

export async function removeCashier(id: string): Promise<void> {
  await call({ action: "remove", id });
}
