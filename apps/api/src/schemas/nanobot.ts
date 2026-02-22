import { z } from "@hono/zod-openapi";

export const nanobotChannelSettingsSchema = z.object({
  whatsappEnabled: z.boolean().default(false),
  telegramEnabled: z.boolean().default(false),
  slackEnabled: z.boolean().default(false),
});

export const nanobotModelConfigSchema = z.object({
  provider: z.string().default(""),
  model: z.string().default(""),
  temperature: z.number().min(0).max(2).nullable().default(null),
  topP: z.number().min(0).max(1).nullable().default(null),
  maxTokens: z.number().int().positive().nullable().default(null),
  reasoningEffort: z.enum(["", "low", "medium", "high"]).default(""),
  streamMode: z.enum(["auto", "sse", "json"]).default("auto"),
});

export const nanobotSoulConfigSchema = z.object({
  content: z.string().default(""),
  versionTag: z.string().default(""),
  editable: z.boolean().default(true),
});

export const nanobotAgentCmdConfigSchema = z.object({
  content: z.string().default(""),
  startupInstructions: z.string().default(""),
  maintenanceInstructions: z.string().default(""),
  allowSelfEdit: z.boolean().default(false),
});

export const nanobotMemoryConfigSchema = z.object({
  enabled: z.boolean().default(true),
  persistent: z.boolean().default(true),
  backend: z.string().default("redis"),
  namespace: z.string().default(""),
  maxEntries: z.number().int().positive().nullable().default(null),
  summarizationEnabled: z.boolean().default(true),
  selfModifyEnabled: z.boolean().default(false),
  notes: z.string().default(""),
});

export const nanobotSkillsConfigSchema = z.object({
  enabled: z.boolean().default(true),
  autoDiscover: z.boolean().default(true),
  allowSelfInstall: z.boolean().default(false),
  allowSelfUpdate: z.boolean().default(false),
  allowSelfRegister: z.boolean().default(false),
  pinnedSkillsText: z.string().default(""),
  blockedSkillsText: z.string().default(""),
});

export const nanobotAutomationConfigSchema = z.object({
  chromeTasksEnabled: z.boolean().default(false),
  scheduledTasksEnabled: z.boolean().default(false),
  timezone: z.string().default(""),
  maxConcurrentJobs: z.number().int().positive().nullable().default(null),
  allowBrowserAutomation: z.boolean().default(false),
});

export const nanobotGatewayChannelConfigSchema = z.object({
  enabled: z.boolean().default(false),
  displayName: z.string().default(""),
  endpoint: z.string().default(""),
  botToken: z.string().default(""),
  secret: z.string().default(""),
  defaultTarget: z.string().default(""),
});

export const nanobotGatewayConfigSchema = z.object({
  whatsapp: nanobotGatewayChannelConfigSchema.default({}),
  telegram: nanobotGatewayChannelConfigSchema.default({}),
  slack: nanobotGatewayChannelConfigSchema.default({}),
});

export const nanobotPppokerMcpConfigSchema = z.object({
  enabled: z.boolean().default(false),
  serverName: z.string().default("pppoker"),
  command: z.string().default("python3"),
  scriptPath: z.string().default("./Ppfichas/pppoker_mcp.py"),
  extraArgsText: z.string().default(""),
  cwd: z.string().default("./Ppfichas"),
  envJson: z.string().default("{}"),
});

export const nanobotMcpConfigSchema = z.object({
  pppoker: nanobotPppokerMcpConfigSchema.default({}),
});

export const nanobotSettingsSchema = z.object({
  enabled: z.boolean().default(false),
  fallbackToLegacy: z.boolean().default(true),
  baseUrl: z.string().url().or(z.literal("")).default(""),
  chatPath: z.string().default("/api/chat"),
  apiKey: z.string().optional().default(""),
  provider: z.string().default(""),
  model: z.string().default(""),
  soul: z.string().default(""),
  agentCmd: z.string().default(""),
  memoryNotes: z.string().default(""),
  modelConfig: nanobotModelConfigSchema.default({}),
  soulConfig: nanobotSoulConfigSchema.default({}),
  agentCmdConfig: nanobotAgentCmdConfigSchema.default({}),
  memoryConfig: nanobotMemoryConfigSchema.default({}),
  skillsConfig: nanobotSkillsConfigSchema.default({}),
  automationConfig: nanobotAutomationConfigSchema.default({}),
  channels: nanobotChannelSettingsSchema.default({
    whatsappEnabled: false,
    telegramEnabled: false,
    slackEnabled: false,
  }),
  gatewayConfig: nanobotGatewayConfigSchema.default({}),
  mcpConfig: nanobotMcpConfigSchema.default({}),
});

export type NanobotSettings = z.infer<typeof nanobotSettingsSchema>;

export function normalizeNanobotSettings(
  raw: NanobotSettings,
): NanobotSettings {
  const modelProvider = raw.modelConfig.provider || raw.provider;
  const modelName = raw.modelConfig.model || raw.model;
  const soulContent = raw.soulConfig.content || raw.soul;
  const agentCmdContent = raw.agentCmdConfig.content || raw.agentCmd;
  const memoryNotes = raw.memoryConfig.notes || raw.memoryNotes;

  return {
    ...raw,
    provider: modelProvider,
    model: modelName,
    soul: soulContent,
    agentCmd: agentCmdContent,
    memoryNotes,
    modelConfig: {
      ...raw.modelConfig,
      provider: modelProvider,
      model: modelName,
    },
    soulConfig: {
      ...raw.soulConfig,
      content: soulContent,
    },
    agentCmdConfig: {
      ...raw.agentCmdConfig,
      content: agentCmdContent,
    },
    memoryConfig: {
      ...raw.memoryConfig,
      notes: memoryNotes,
    },
    gatewayConfig: {
      ...raw.gatewayConfig,
      whatsapp: {
        ...raw.gatewayConfig.whatsapp,
        enabled:
          raw.gatewayConfig.whatsapp.enabled || raw.channels.whatsappEnabled,
      },
      telegram: {
        ...raw.gatewayConfig.telegram,
        enabled:
          raw.gatewayConfig.telegram.enabled || raw.channels.telegramEnabled,
      },
      slack: {
        ...raw.gatewayConfig.slack,
        enabled: raw.gatewayConfig.slack.enabled || raw.channels.slackEnabled,
      },
    },
    channels: {
      ...raw.channels,
      whatsappEnabled:
        raw.channels.whatsappEnabled || raw.gatewayConfig.whatsapp.enabled,
      telegramEnabled:
        raw.channels.telegramEnabled || raw.gatewayConfig.telegram.enabled,
      slackEnabled:
        raw.channels.slackEnabled || raw.gatewayConfig.slack.enabled,
    },
    mcpConfig: {
      ...raw.mcpConfig,
      pppoker: {
        ...raw.mcpConfig.pppoker,
        serverName: raw.mcpConfig.pppoker.serverName || "pppoker",
        command: raw.mcpConfig.pppoker.command || "python3",
        scriptPath:
          raw.mcpConfig.pppoker.scriptPath || "./Ppfichas/pppoker_mcp.py",
        cwd: raw.mcpConfig.pppoker.cwd || "./Ppfichas",
        envJson: raw.mcpConfig.pppoker.envJson || "{}",
      },
    },
  };
}
