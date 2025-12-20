"use server";

import { z } from "zod";
import { authActionClient } from "./safe-action";

// Plain integration removed - feedback is logged locally only
export const sendFeebackAction = authActionClient
  .schema(
    z.object({
      feedback: z.string(),
    }),
  )
  .metadata({ name: "send-feedback" })
  .action(async ({ parsedInput: { feedback }, ctx: { user } }) => {
    // Log feedback locally instead of sending to external service
    console.log("[Feedback]", {
      userId: user.id,
      email: user.email,
      feedback,
      timestamp: new Date().toISOString(),
    });

    return {
      data: {
        success: true,
      },
    };
  });
