import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const [{ count: docCount }, { count: questionCount }, { data: recentMessages }] =
    await Promise.all([
      supabase.from("documents").select("id", { count: "exact", head: true }).eq("owner_id", user.id),
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
        .order("created_at", { ascending: false })
        .limit(200),
    ]);

  // Bucket questions asked per day, last 7 days, for the usage chart
  const days: { label: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const label = d.toLocaleDateString(undefined, { weekday: "short" });
    const count =
      recentMessages?.filter((m) => {
        const md = new Date(m.created_at);
        return md.toDateString() === d.toDateString();
      }).length ?? 0;
    days.push({ label, count });
  }

  return NextResponse.json({
    documentCount: docCount ?? 0,
    questionCount: questionCount ?? 0,
    dailyQuestions: days,
  });
}
