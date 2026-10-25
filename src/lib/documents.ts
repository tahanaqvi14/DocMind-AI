import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Uploads are processed inside the request, so a function that dies part-way
 * (Vercel's 60s limit on a large PDF) leaves its document "processing"
 * forever: a spinner that never stops, polling that never ends, and a slot
 * counted against the Free plan. Nothing legitimately runs this long.
 */
const STALE_AFTER_MS = 5 * 60 * 1000;

/** Marks this user's abandoned uploads as failed. Needs the admin client:
 *  users cannot write documents directly (migration 0002). */
export async function failStaleUploads(admin: SupabaseClient, ownerId: string): Promise<void> {
  const { error } = await admin
    .from("documents")
    .update({
      status: "failed",
      error_message: "Processing didn't finish. Please upload this file again.",
    })
    .eq("owner_id", ownerId)
    .eq("status", "processing")
    .lt("created_at", new Date(Date.now() - STALE_AFTER_MS).toISOString());
  if (error) console.error("Could not clear stale uploads:", error.message);
}
