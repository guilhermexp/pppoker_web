import { z } from "zod";

const envSchema = z.object({
  // Database (required)
  DATABASE_PRIMARY_URL: z.string().min(1),
  DATABASE_SESSION_POOLER: z.string().min(1),

  // Supabase (required)
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_KEY: z.string().min(1),

  // Redis (required)
  REDIS_URL: z.string().min(1),

  // API config
  PORT: z.coerce.number().default(3101),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  ALLOWED_API_ORIGINS: z.string().default("http://localhost:3100"),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace"])
    .default("info"),

  // Dashboard URL
  MIDDAY_DASHBOARD_URL: z.string().default("http://localhost:3100"),

  // PPPoker bridge (optional)
  PPPOKER_BRIDGE_URL: z.string().default("http://localhost:3102"),
  PPPOKER_SYNC_ENABLED: z.string().default("true"),

  // Nanobot (optional)
  NANOBOT_BASE_URL: z.string().optional(),
  NANOBOT_CHAT_PATH: z.string().default("/api/chat"),
  NANOBOT_API_KEY: z.string().optional(),
  NANOBOT_ORCHESTRATION_INTERNAL_TOKEN: z.string().optional(),
  NANOBOT_ORCHESTRATION_CALLBACK_URL: z.string().optional(),

  // External services (optional)
  OPENAI_API_KEY: z.string().optional(),
  OPENROUTER_API_KEY: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  RESEND_AUDIENCE_ID: z.string().optional(),
  TRIGGER_SECRET_KEY: z.string().optional(),
  TRIGGER_PROJECT_ID: z.string().optional(),
  GOOGLE_GENERATIVE_AI_API_KEY: z.string().optional(),

  // Security
  INVOICE_JWT_SECRET: z.string().optional(),
  MIDDAY_ENCRYPTION_KEY: z.string().optional(),
  FASTCHIPS_API_KEY: z.string().optional(),
  INFINITEPAY_WEBHOOK_SECRET: z.string().optional(),
  INFINITEPAY_WEBHOOK_URL: z.string().optional(),

  // Database replicas (optional)
  DATABASE_FRA_URL: z.string().optional(),
  DATABASE_SJC_URL: z.string().optional(),
  DATABASE_IAD_URL: z.string().optional(),

  // Fly.io (optional, set by platform)
  FLY_REGION: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const formatted = result.error.issues
      .map((i) => `  ${i.path.join(".")}: ${i.message}`)
      .join("\n");

    console.error(`\nMissing or invalid environment variables:\n${formatted}\n`);
    process.exit(1);
  }

  return result.data;
}

export const env = validateEnv();
