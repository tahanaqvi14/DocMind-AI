import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/Sidebar";
import { MobileNav } from "@/components/MobileNav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let plan: "free" | "pro" = "free";
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("plan")
      .eq("id", user.id)
      .single();
    if (profile?.plan === "pro") plan = "pro";
  }

  return (
    <div className="min-h-screen bg-ink md:flex">
      <Sidebar email={user?.email ?? ""} plan={plan} />
      <div className="flex-1">
        <MobileNav email={user?.email ?? ""} plan={plan} />
        <main className="px-4 py-6 md:px-10 md:py-10">{children}</main>
      </div>
    </div>
  );
}
