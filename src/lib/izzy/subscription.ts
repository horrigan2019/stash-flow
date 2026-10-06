import { getSessionUser } from "@/lib/auth";
import { isSubscribed } from "@/lib/store";
import { getSupabaseAdmin } from "@/lib/supabase/server";

/**
 * Pro gate for Ask Izzy / chat.
 * Prefers Supabase profiles.is_subscribed when configured;
 * falls back to Oh Stuffing session subscription (trial/active).
 */
export async function userHasIzzyPro(): Promise<{
  subscribed: boolean;
  userId: string | null;
  email: string | null;
  source: "supabase" | "session" | "none";
}> {
  const sessionUser = await getSessionUser();
  const admin = getSupabaseAdmin();

  if (admin && sessionUser) {
    const { data } = await admin
      .from("profiles")
      .select("is_subscribed, email")
      .eq("id", sessionUser.id)
      .maybeSingle();
    if (data) {
      return {
        subscribed: Boolean(data.is_subscribed),
        userId: sessionUser.id,
        email: data.email ?? sessionUser.email,
        source: "supabase",
      };
    }
  }

  if (sessionUser && isSubscribed(sessionUser)) {
    return {
      subscribed: true,
      userId: sessionUser.id,
      email: sessionUser.email,
      source: "session",
    };
  }

  // Dev/demo escape hatch for local UI without auth
  if (process.env.IZZY_PRO_UNLOCK === "true") {
    return {
      subscribed: true,
      userId: sessionUser?.id ?? null,
      email: sessionUser?.email ?? null,
      source: "none",
    };
  }

  return {
    subscribed: false,
    userId: sessionUser?.id ?? null,
    email: sessionUser?.email ?? null,
    source: sessionUser ? "session" : "none",
  };
}
