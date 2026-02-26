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
  const modelConfig = raw.modelConfig ?? ({} as NanobotSettings["modelConfig"]);
  const soulConfig = raw.soulConfig ?? ({} as NanobotSettings["soulConfig"]);
  const agentCmdConfig = raw.agentCmdConfig ?? ({} as NanobotSettings["agentCmdConfig"]);
  const memoryConfig = raw.memoryConfig ?? ({} as NanobotSettings["memoryConfig"]);
  const gatewayConfig = raw.gatewayConfig ?? ({} as NanobotSettings["gatewayConfig"]);
  const channels = raw.channels ?? ({} as NanobotSettings["channels"]);
  const mcpConfig = raw.mcpConfig ?? ({} as NanobotSettings["mcpConfig"]);

  const whatsapp = gatewayConfig.whatsapp ?? ({} as NanobotSettings["gatewayConfig"]["whatsapp"]);
  const telegram = gatewayConfig.telegram ?? ({} as NanobotSettings["gatewayConfig"]["telegram"]);
  const slack = gatewayConfig.slack ?? ({} as NanobotSettings["gatewayConfig"]["slack"]);
  const pppoker = mcpConfig.pppoker ?? ({} as NanobotSettings["mcpConfig"]["pppoker"]);

  const modelProvider = modelConfig.provider || raw.provider;
  const modelName = modelConfig.model || raw.model;
  const soulContent = soulConfig.content || raw.soul;
  const agentCmdContent = agentCmdConfig.content || raw.agentCmd;
  const memoryNotes = memoryConfig.notes || raw.memoryNotes;

  return {
    ...raw,
    provider: modelProvider,
    model: modelName,
    soul: soulContent,
    agentCmd: agentCmdContent,
    memoryNotes,
    modelConfig: {
      ...modelConfig,
      provider: modelProvider,
      model: modelName,
    },
    soulConfig: {
      ...soulConfig,
      content: soulContent,
    },
    agentCmdConfig: {
      ...agentCmdConfig,
      content: agentCmdContent,
    },
    memoryConfig: {
      ...memoryConfig,
      notes: memoryNotes,
    },
    gatewayConfig: {
      ...gatewayConfig,
      whatsapp: {
        ...whatsapp,
        enabled: whatsapp.enabled || channels.whatsappEnabled,
      },
      telegram: {
        ...telegram,
        enabled: telegram.enabled || channels.telegramEnabled,
      },
      slack: {
        ...slack,
        enabled: slack.enabled || channels.slackEnabled,
      },
    },
    channels: {
      ...channels,
      whatsappEnabled: channels.whatsappEnabled || whatsapp.enabled,
      telegramEnabled: channels.telegramEnabled || telegram.enabled,
      slackEnabled: channels.slackEnabled || slack.enabled,
    },
    mcpConfig: {
      ...mcpConfig,
      pppoker: {
        ...pppoker,
        serverName: pppoker.serverName || "pppoker",
        command: pppoker.command || "python3",
        scriptPath: pppoker.scriptPath || "./Ppfichas/pppoker_mcp.py",
        cwd: pppoker.cwd || "./Ppfichas",
        envJson: pppoker.envJson || "{}",
      },
    },
  };
}
