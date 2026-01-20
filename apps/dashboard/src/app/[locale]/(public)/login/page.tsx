import { AuthPage } from "@/components/ui/auth-page";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login | Mid Poker",
};

export default async function Page() {
  return <AuthPage />;
}
