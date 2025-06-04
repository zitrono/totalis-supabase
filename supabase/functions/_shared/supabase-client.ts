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
    .from("profiles")
    .select("coach_id")
    .eq("user_id", userId)
    .single();

  // Get recent categories from check-ins
  const { data: recentCheckIns } = await supabase
    .from("checkins")
    .select("category_id, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(10);

  // Get unique recent categories
  const recentCategories = [
    ...new Set(recentCheckIns?.map((c: any) => c.category_id) || []),
  ] as string[];

  // Get check-in history with proper mapping
  const { data: checkInHistory } = await supabase
    .from("checkins")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  // Map to UserContext interface with snake_case
  const mappedCheckInHistory = (checkInHistory || []).map((checkin: any) => ({
    id: checkin.id,
    user_id: checkin.user_id,
    category_id: checkin.category_id,
    status: checkin.status,
    started_at: checkin.created_at,
    completed_at: checkin.completed_at,
    responses: checkin.responses || [],
  }));

  return {
    user_id: userId,
    coach_id: userProfile?.coach_id || "",
    recent_categories: recentCategories.slice(0, 5),
    check_in_history: mappedCheckInHistory,
  };
}
