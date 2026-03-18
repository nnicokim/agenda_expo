import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import "react-native-url-polyfill/auto";

const SUPABASE_URL = (process.env.EXPO_PUBLIC_SUPABASE_URL ?? "").trim();
const SUPABASE_ANON_KEY = (
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? ""
).trim();

const hasSupabaseEnv = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

const FALLBACK_SUPABASE_URL = "https://placeholder.supabase.co";
const FALLBACK_SUPABASE_ANON_KEY = "placeholder-anon-key";

export const supabaseConfigError = hasSupabaseEnv
  ? null
  : "Faltan EXPO_PUBLIC_SUPABASE_URL y/o EXPO_PUBLIC_SUPABASE_ANON_KEY en el entorno de build.";

if (!hasSupabaseEnv) {
  console.warn(
    "⚠️  Supabase: faltan variables de entorno.\n" +
      "   Revisá tu archivo .env:\n" +
      "   EXPO_PUBLIC_SUPABASE_URL\n" +
      "   EXPO_PUBLIC_SUPABASE_ANON_KEY",
  );
}

export const supabase = createClient(
  hasSupabaseEnv ? SUPABASE_URL : FALLBACK_SUPABASE_URL,
  hasSupabaseEnv ? SUPABASE_ANON_KEY : FALLBACK_SUPABASE_ANON_KEY,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
);
