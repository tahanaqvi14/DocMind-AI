import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { failStaleUploads } from "@/lib/documents";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  // So an upload that died mid-way shows as failed instead of spinning forever.
  await failStaleUploads(createAdminClient(), user.id);

  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: "Couldn't load your documents." }, { status: 500 });
  return NextResponse.json({ documents: data });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  let id: unknown;
  try {
    ({ id } = await request.json());
  } catch {
    return NextResponse.json({ error: "Malformed request" }, { status: 400 });
  }
  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "Missing document id" }, { status: 400 });
  }

  // RLS ensures this can only ever delete a row owned by the current user
  const { error } = await supabase.from("documents").delete().eq("id", id).eq("owner_id", user.id);
  if (error) return NextResponse.json({ error: "Couldn't delete that document." }, { status: 500 });

  return NextResponse.json({ success: true });
}
