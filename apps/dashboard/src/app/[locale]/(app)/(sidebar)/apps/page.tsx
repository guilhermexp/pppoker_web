import { Apps } from "@/components/apps";
import { HydrateClient } from "@/trpc/server";
import { createClient } from "@midpoker/supabase/server";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Apps | Midday",
};

export default async function Page() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  return (
    <HydrateClient>
      <div className="mt-4">
        <Apps />
      </div>
    </HydrateClient>
  );
}
