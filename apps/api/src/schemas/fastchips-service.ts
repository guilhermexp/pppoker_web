import { z } from "@hono/zod-openapi";

export const fastchipsServiceSettingsSchema = z.object({
  status: z.enum(["inactive", "setup", "active"]).default("inactive"),
  activatedAt: z.string().nullable().default(null),

  setupSteps: z
    .object({
      infinitepayConfigured: z.boolean().default(false),
      nanobotConfigured: z.boolean().default(false),
      gatewayConfigured: z.boolean().default(false),
    })
    .default({}),

  controlPanel: z
    .object({
      minPurchaseReais: z.number().default(5),
      minWithdrawReais: z.number().default(50),
      dailyLimit: z.number().default(4),
      notificationsEnabled: z.boolean().default(true),
      withdrawType: z.enum(["auto", "manual"]).default("auto"),
      maxWithdrawReais: z.number().default(3000),
      leagueId: z.string().default(""),
    })
    .default({}),

  gateway: z
    .object({
      whatsappLinked: z.boolean().default(false),
      whatsappLinkedAt: z.string().nullable().default(null),
      telegramLinked: z.boolean().default(false),
      telegramLinkedAt: z.string().nullable().default(null),
    })
    .default({}),
});

export type FastchipsServiceSettings = z.infer<
  typeof fastchipsServiceSettingsSchema
>;

export function normalizeFastchipsServiceSettings(
  raw: unknown,
): FastchipsServiceSettings {
  if (!raw || typeof raw !== "object") {
    return {
      status: "inactive",
      activatedAt: null,
      setupSteps: {
        infinitepayConfigured: false,
        nanobotConfigured: false,
        gatewayConfigured: false,
      },
      controlPanel: {
        minPurchaseReais: 5,
        minWithdrawReais: 50,
        dailyLimit: 4,
        notificationsEnabled: true,
        withdrawType: "auto",
        maxWithdrawReais: 3000,
        leagueId: "",
      },
      gateway: {
        whatsappLinked: false,
        whatsappLinkedAt: null,
        telegramLinked: false,
        telegramLinkedAt: null,
      },
    };
  }

  const obj = raw as Record<string, unknown>;
  const setupSteps = (obj.setupSteps ?? {}) as Record<string, unknown>;
  const controlPanel = (obj.controlPanel ?? {}) as Record<string, unknown>;
  const gateway = (obj.gateway ?? {}) as Record<string, unknown>;

  return {
    status:
      obj.status === "inactive" ||
      obj.status === "setup" ||
      obj.status === "active"
        ? obj.status
        : "inactive",
    activatedAt:
      typeof obj.activatedAt === "string" ? obj.activatedAt : null,

    setupSteps: {
      infinitepayConfigured:
        typeof setupSteps.infinitepayConfigured === "boolean"
          ? setupSteps.infinitepayConfigured
          : false,
      nanobotConfigured:
        typeof setupSteps.nanobotConfigured === "boolean"
          ? setupSteps.nanobotConfigured
          : false,
      gatewayConfigured:
        typeof setupSteps.gatewayConfigured === "boolean"
          ? setupSteps.gatewayConfigured
          : false,
    },

    controlPanel: {
      minPurchaseReais:
        typeof controlPanel.minPurchaseReais === "number"
          ? controlPanel.minPurchaseReais
          : 5,
      minWithdrawReais:
        typeof controlPanel.minWithdrawReais === "number"
          ? controlPanel.minWithdrawReais
          : 50,
      dailyLimit:
        typeof controlPanel.dailyLimit === "number"
          ? controlPanel.dailyLimit
          : 4,
      notificationsEnabled:
        typeof controlPanel.notificationsEnabled === "boolean"
          ? controlPanel.notificationsEnabled
          : true,
      withdrawType:
        controlPanel.withdrawType === "auto" ||
        controlPanel.withdrawType === "manual"
          ? controlPanel.withdrawType
          : "auto",
      maxWithdrawReais:
        typeof controlPanel.maxWithdrawReais === "number"
          ? controlPanel.maxWithdrawReais
          : 3000,
      leagueId:
        typeof controlPanel.leagueId === "string"
          ? controlPanel.leagueId
          : "",
    },

    gateway: {
      whatsappLinked:
        typeof gateway.whatsappLinked === "boolean"
          ? gateway.whatsappLinked
          : false,
      whatsappLinkedAt:
        typeof gateway.whatsappLinkedAt === "string"
          ? gateway.whatsappLinkedAt
          : null,
      telegramLinked:
        typeof gateway.telegramLinked === "boolean"
          ? gateway.telegramLinked
          : false,
      telegramLinkedAt:
        typeof gateway.telegramLinkedAt === "string"
          ? gateway.telegramLinkedAt
          : null,
    },
  };
}
