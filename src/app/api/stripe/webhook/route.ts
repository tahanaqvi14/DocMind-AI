import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/server";

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

export const runtime = "nodejs";

export async function POST(request: Request) {
  const stripe = getStripe();
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!stripe || !signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing webhook signature or secret" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${err instanceof Error ? err.message : "unknown"}` },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  // A failed database write must answer non-2xx so Stripe retries the
  // event. Answering 200 regardless meant a customer could pay and never
  // be upgraded, with nothing left to retry.
  let writeError: { message: string } | null = null;

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.supabase_user_id;
      if (userId) {
        const customerId =
          typeof session.customer === "string" ? session.customer : session.customer?.id;
        // Also record the customer id, in case checkout's own save failed;
        // the cancellation event below finds the profile by it.
        ({ error: writeError } = await admin
          .from("profiles")
          .update(customerId ? { plan: "pro", stripe_customer_id: customerId } : { plan: "pro" })
          .eq("id", userId));
      }
      break;
    }
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId =
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer.id;
      ({ error: writeError } = await admin
        .from("profiles")
        .update({ plan: "free" })
        .eq("stripe_customer_id", customerId));
      break;
    }
  }

  if (writeError) {
    console.error(`Stripe webhook ${event.type} failed to update profile:`, writeError.message);
    return NextResponse.json({ error: "Profile update failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
