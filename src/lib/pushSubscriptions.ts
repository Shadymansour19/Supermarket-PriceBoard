import { supabase } from "./supabase";

/** Registers (or re-registers, since `endpoint` is unique) this device for
 * deal push notifications. No `.select()` on the way back — not needed,
 * and skipping it keeps the request smaller (`Prefer: return=minimal`). */
export async function registerPushSubscription(subscription: PushSubscription, lang: string): Promise<void> {
  const json = subscription.toJSON();
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      endpoint: json.endpoint,
      p256dh: json.keys?.p256dh,
      auth: json.keys?.auth,
      lang,
    },
    { onConflict: "endpoint" },
  );
  if (error) throw error;
}

export async function unregisterPushSubscription(endpoint: string): Promise<void> {
  const { error } = await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
  if (error) throw error;
}
