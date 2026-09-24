// Deno Edge Function — deployed with --no-verify-jwt, since it's only ever
// called by our own Supabase Database Webhook (no logged-in user, so no
// Supabase JWT to verify). Authenticated instead by a shared secret the
// webhook sends as a custom header. See the deployment runbook for how
// this gets wired up (a step outside this repo, done in the Supabase
// dashboard).
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FUNCTION_SECRET = Deno.env.get("FUNCTION_SECRET")!;
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT")!;

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

type WebhookPayload = {
  type: "INSERT";
  table: string;
  record: { product_id: string; new_price: number };
};

type PushText = { title: string; body: string };

function pushTextFor(lang: string, productName: string, newPrice: number): PushText {
  const price = new Intl.NumberFormat(lang === "ar" ? "ar" : "en", { style: "currency", currency: "EGP" }).format(
    newPrice,
  );
  return lang === "ar"
    ? { title: "عرض جديد لفترة محدودة!", body: `${productName} الآن بسعر ${price}` }
    : { title: "New limited-time deal!", body: `${productName} is now ${price}` };
}

Deno.serve(async (req) => {
  if (req.headers.get("authorization") !== `Bearer ${FUNCTION_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const payload = (await req.json()) as WebhookPayload;
  if (payload.table !== "limited_time_discounts" || payload.type !== "INSERT") {
    return new Response("Ignored", { status: 200 });
  }

  const { data: product } = await supabase
    .from("products")
    .select("name_en, name_ar")
    .eq("id", payload.record.product_id)
    .maybeSingle();
  if (!product) return new Response("Product not found", { status: 200 });

  const { data: subscriptions, error } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth, lang");
  if (error) throw error;

  const staleEndpoints: string[] = [];

  await Promise.all(
    (subscriptions ?? []).map(async (sub) => {
      const name = sub.lang === "ar" ? product.name_ar : product.name_en;
      const { title, body } = pushTextFor(sub.lang, name, payload.record.new_price);

      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify({ title, body, url: `/product/${payload.record.product_id}` }),
        );
      } catch (err) {
        // 404/410 means the browser dropped this subscription — clean it
        // up rather than retrying it forever.
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) staleEndpoints.push(sub.endpoint);
      }
    }),
  );

  if (staleEndpoints.length > 0) {
    await supabase.from("push_subscriptions").delete().in("endpoint", staleEndpoints);
  }

  return new Response("OK", { status: 200 });
});
