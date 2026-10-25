import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient, createAdminClient } from "@/lib/supabase/server";

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

export async function POST() {
  const stripe = getStripe();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  if (!stripe || !process.env.STRIPE_PRO_PRICE_ID) {
    return NextResponse.json(
      { error: "Stripe isn't configured yet. Add STRIPE_SECRET_KEY and STRIPE_PRO_PRICE_ID to .env.local." },
      { status: 500 }
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id, email, plan")
    .eq("id", user.id)
    .single();

  // The public pricing page shows "Upgrade" to everyone, so without this an
  // existing Pro user could start (and pay for) a second subscription.
  if (profile?.plan === "pro") {
    return NextResponse.json(
      { error: "You're already on Pro. Use Manage billing to change your plan." },
      { status: 400 }
    );
  }

  let customerId = profile?.stripe_customer_id ?? undefined;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: profile?.email ?? user.email ?? undefined,
      metadata: { supabase_user_id: user.id },
    });
    customerId = customer.id;
    // Users cannot write their own profile row (see migration 0002), so the
    // customer id is saved with the service-role client.
    const { error: saveError } = await createAdminClient()
      .from("profiles")
      .update({ stripe_customer_id: customerId })
      .eq("id", user.id);
    if (saveError) {
      return NextResponse.json({ error: "Couldn't save your billing account." }, { status: 500 });
    }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: process.env.STRIPE_PRO_PRICE_ID, quantity: 1 }],
    success_url: `${appUrl}/dashboard/billing?upgraded=1`,
    cancel_url: `${appUrl}/dashboard/billing`,
    metadata: { supabase_user_id: user.id },
  });

  return NextResponse.json({ url: session.url });
}
