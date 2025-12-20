"use server";

import { z } from "zod";
import { authActionClient } from "./safe-action";

// Plain integration removed - support requests are logged locally only
export const sendSupportAction = authActionClient
  .schema(
    z.object({
      subject: z.string(),
      priority: z.string(),
      type: z.string(),
      message: z.string(),
      url: z.string().optional(),
    }),
  )
  .metadata({ name: "send-support" })
  .action(async ({ parsedInput: data, ctx: { user } }) => {
    // Log support request locally instead of sending to external service
    console.log("[Support Request]", {
      userId: user.id,
      email: user.email,
      subject: data.subject,
      priority: data.priority,
      type: data.type,
      message: data.message,
      url: data.url,
      timestamp: new Date().toISOString(),
    });

    return {
      data: {
        success: true,
      },
    };
  });
