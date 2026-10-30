// Deno Edge Function — lets an admin list / create / reset the password of /
// remove cashier accounts from the app. Creating login accounts needs the
// service-role key, which must never reach the browser, so it lives here.
//
// Deployed WITH JWT verification (the default, unlike notify-new-deal): the
// browser calls it via supabase.functions.invoke() with the signed-in
// user's token. On top of that, the function itself re-checks that the
// caller is an admin (`is_admin()` evaluated with the caller's own token)
// and only ever touches accounts whose profile role is 'cashier' — it can't
// be used to change or delete an admin.
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const MIN_PASSWORD_LENGTH = 8;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const fail = (error: string, status = 400) => json({ error }, status);

type Body = {
  action?: "list" | "create" | "set_password" | "remove";
  id?: string;
  email?: string;
  password?: string;
  display_name?: string;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return fail("method_not_allowed", 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return fail("not_authorized", 401);

  // Evaluated as the caller, so is_admin() sees their own auth.uid().
  const caller = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authHeader } } });
  const { data: isAdmin } = await caller.rpc("is_admin");
  if (isAdmin !== true) return fail("not_authorized", 403);

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return fail("invalid_input");
  }

  // Guard for the actions that target an existing account.
  async function requireCashier(id: string | undefined): Promise<boolean> {
    if (!id) return false;
    const { data } = await admin.from("profiles").select("role").eq("id", id).maybeSingle();
    return data?.role === "cashier";
  }

  switch (body.action) {
    case "list": {
      const { data: profiles, error } = await admin
        .from("profiles")
        .select("id, display_name, created_at")
        .eq("role", "cashier")
        .order("created_at");
      if (error) return fail("server_error", 500);
      const cashiers = await Promise.all(
        (profiles ?? []).map(async (profile) => {
          const { data } = await admin.auth.admin.getUserById(profile.id);
          return { ...profile, email: data.user?.email ?? null };
        }),
      );
      return json({ cashiers });
    }

    case "create": {
      const email = body.email?.trim().toLowerCase();
      const displayName = body.display_name?.trim();
      if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !displayName) return fail("invalid_input");
      if (!body.password || body.password.length < MIN_PASSWORD_LENGTH) return fail("weak_password");

      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email,
        password: body.password,
        // No confirmation email — the admin hands the credentials over.
        email_confirm: true,
      });
      if (createError || !created.user) {
        return createError?.message.toLowerCase().includes("already")
          ? fail("email_exists", 409)
          : fail("server_error", 500);
      }

      const { error: profileError } = await admin
        .from("profiles")
        .insert({ id: created.user.id, role: "cashier", display_name: displayName });
      if (profileError) {
        // Don't leave a login with no role behind.
        await admin.auth.admin.deleteUser(created.user.id);
        return fail("server_error", 500);
      }
      return json({ id: created.user.id });
    }

    case "set_password": {
      if (!(await requireCashier(body.id))) return fail("not_cashier", 404);
      if (!body.password || body.password.length < MIN_PASSWORD_LENGTH) return fail("weak_password");
      const { error } = await admin.auth.admin.updateUserById(body.id!, { password: body.password });
      return error ? fail("server_error", 500) : json({ ok: true });
    }

    case "remove": {
      if (!(await requireCashier(body.id))) return fail("not_cashier", 404);
      // Deleting the auth user cascades to the profile; their invoices stay
      // (created_by becomes null, the cashier's name is snapshotted on each).
      const { error } = await admin.auth.admin.deleteUser(body.id!);
      return error ? fail("server_error", 500) : json({ ok: true });
    }

    default:
      return fail("invalid_input");
  }
});
