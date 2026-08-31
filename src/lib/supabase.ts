import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY — copy .env.example to .env.local and fill them in.",
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

const IMAGE_BUCKET = "product-images";

/** Public URL for an image stored at `path` in the product-images bucket. */
export function productImageUrl(path: string | null): string | null {
  if (!path) return null;
  return supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path).data
    .publicUrl;
}

export { IMAGE_BUCKET };
