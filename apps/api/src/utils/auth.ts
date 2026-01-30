import type { Database } from "@midpoker/supabase/types";
import { createClient } from "@supabase/supabase-js";

export type Session = {
  user: {
    id: string;
    email?: string;
    full_name?: string;
  };
  teamId?: string;
};

export async function verifyAccessToken(
  accessToken?: string,
): Promise<Session | null> {
  if (!accessToken) return null;

  try {
    // Create a Supabase client with the access token
    const supabase = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      },
    );

    // Use getUser() to verify the token - this validates with Supabase
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(accessToken);

    if (error || !user) {
      console.log("[verifyAccessToken] Failed:", error?.message || "No user");
      return null;
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name,
      },
    };
  } catch (error) {
    console.log("[verifyAccessToken] Exception:", error);
    return null;
  }
}
