/**
 * A readable message from any thrown value — not just real `Error`
 * instances. Supabase's Postgrest/Storage errors are plain objects (not
 * `Error` instances) that still carry a `.message` string; without this,
 * `String(err)` on one of those renders as the unhelpful "[object
 * Object]" instead of the actual problem.
 */
export function toErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null && "message" in err && typeof err.message === "string") {
    return err.message;
  }
  return String(err);
}
