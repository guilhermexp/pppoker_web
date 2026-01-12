"use client";

import { createClient } from "@midpoker/supabase/client";
import { Button } from "@midpoker/ui/button";

export function SignOutButton() {
  const supabase = createClient();

  return (
    <Button
      variant="outline"
      className="w-full"
      onClick={() => supabase.auth.signOut()}
    >
      Sign out
    </Button>
  );
}
