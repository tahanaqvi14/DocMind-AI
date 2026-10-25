import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  // Eight days back so the browser can bucket the last seven of ITS days:
  // the server runs in UTC and does not know the user's timezone.
  const since = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();

  const [docs, questions, recent] = await Promise.all([
    supabase
      .from("documents")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", user.id)
      .eq("status", "ready"),
    supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", user.id)
      .eq("role", "user"),
    supabase
      .from("messages")
      .select("created_at")
      .eq("owner_id", user.id)
      .eq("role", "user")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(1000),
  ]);

  if (docs.error || questions.error || recent.error) {
    return NextResponse.json({ error: "Couldn't load usage." }, { status: 500 });
  }

  return NextResponse.json({
    documentCount: docs.count ?? 0,
    questionCount: questions.count ?? 0,
    recentQuestionTimes: (recent.data ?? []).map((m) => m.created_at as string),
  });
}
