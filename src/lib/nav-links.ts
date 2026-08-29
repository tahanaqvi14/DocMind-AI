import { LayoutDashboard, FileText, MessageSquareText, CreditCard } from "lucide-react";

export const navLinks = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/documents", label: "Documents", icon: FileText },
  { href: "/dashboard/chat", label: "Chat", icon: MessageSquareText },
  { href: "/dashboard/billing", label: "Billing", icon: CreditCard },
] as const;
