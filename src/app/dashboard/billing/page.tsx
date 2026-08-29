import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { BillingPanel } from "@/components/BillingPanel";
import type { Plan } from "@/types";

export default async function BillingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let plan: Plan = "free";
  let documentCount = 0;

  if (user) {
    const [{ data: profile }, { count }] = await Promise.all([
      supabase.from("profiles").select("plan").eq("id", user.id).single(),
      supabase
        .from("documents")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", user.id),
    ]);
    if (profile?.plan === "pro") plan = "pro";
    documentCount = count ?? 0;
  }

  return (
    <div>
      <h1 className="font-display text-3xl font-medium">Billing</h1>
      <p className="mt-1 text-ink-muted">Manage your plan and subscription.</p>

      <div className="mt-8">
        <Suspense fallback={null}>
          <BillingPanel plan={plan} documentCount={documentCount} />
        </Suspense>
      </div>
    </div>
  );
}
