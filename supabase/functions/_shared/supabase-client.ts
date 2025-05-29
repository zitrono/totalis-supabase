import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { UserContext } from "./types.ts";

export function createSupabaseClient(authHeader?: string) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  const options = authHeader
    ? {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    }
    : {};

  return createClient(supabaseUrl, supabaseAnonKey, options);
}

export async function getUserContext(
  supabase: any,
  userId: string,
): Promise<UserContext> {
  // Get user's coach
  const { data: userProfile } = await supabase
    .from("user_profiles")
    .select("coach_id")
    .eq("id", userId)
    .single();

  // Get recent categories from check-ins
  const { data: recentCheckIns } = await supabase
    .from("check_ins")
    .select("category_id, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(10);

  // Get unique recent categories
  const recentCategories = [
    ...new Set(recentCheckIns?.map((c: any) => c.category_id) || []),
  ] as string[];

  // Get check-in history
  const { data: checkInHistory } = await supabase
    .from("check_ins")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  return {
    userId,
    coachId: userProfile?.coach_id || "",
    recentCategories: recentCategories.slice(0, 5),
    checkInHistory: checkInHistory || [],
  };
}
