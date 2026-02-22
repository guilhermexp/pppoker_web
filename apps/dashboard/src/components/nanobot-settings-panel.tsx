"use client";

import { useTRPC } from "@/trpc/client";
import { Badge } from "@midpoker/ui/badge";
import { Button } from "@midpoker/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@midpoker/ui/card";
import { Input } from "@midpoker/ui/input";
import { Label } from "@midpoker/ui/label";
import { Switch } from "@midpoker/ui/switch";
import { Textarea } from "@midpoker/ui/textarea";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

type NanobotSettingsForm = {
  enabled: boolean;
  fallbackToLegacy: boolean;
  baseUrl: string;
  chatPath: string;
  apiKey: string;
  provider: string;
  model: string;
  soul: string;
  agentCmd: string;
  memoryNotes: string;
  channels: {
    whatsappEnabled: boolean;
    telegramEnabled: boolean;
    slackEnabled: boolean;
  };
  modelConfig: {
    provider: string;
    model: string;
    temperature: number | null;
    topP: number | null;
    maxTokens: number | null;
    reasoningEffort: "" | "low" | "medium" | "high";
    streamMode: "auto" | "sse" | "json";
  };
  soulConfig: {
    content: string;
    versionTag: string;
    editable: boolean;
  };
  agentCmdConfig: {
    content: string;
    startupInstructions: string;
    maintenanceInstructions: string;
    allowSelfEdit: boolean;
  };
  memoryConfig: {
    enabled: boolean;
    persistent: boolean;
    backend: string;
    namespace: string;
    maxEntries: number | null;
    summarizationEnabled: boolean;
    selfModifyEnabled: boolean;
    notes: string;
  };
  skillsConfig: {
    enabled: boolean;
    autoDiscover: boolean;
    allowSelfInstall: boolean;
    allowSelfUpdate: boolean;
    allowSelfRegister: boolean;
    pinnedSkillsText: string;
    blockedSkillsText: string;
  };
  automationConfig: {
    chromeTasksEnabled: boolean;
    scheduledTasksEnabled: boolean;
    timezone: string;
    maxConcurrentJobs: number | null;
    allowBrowserAutomation: boolean;
  };
  gatewayConfig: {
    whatsapp: GatewayConfig;
    telegram: GatewayConfig;
    slack: GatewayConfig;
  };
};

type GatewayConfig = {
  enabled: boolean;
  displayName: string;
  endpoint: string;
  botToken: string;
  secret: string;
  defaultTarget: string;
};

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onCheckedChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-md border p-3 gap-4">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

function parseNullableNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function GatewayCard({
  title,
  subtitle,
  value,
  onChange,
}: {
  title: string;
  subtitle: string;
  value: GatewayConfig;
  onChange: (next: GatewayConfig) => void;
}) {
  return (
    <div className="rounded-lg border p-4 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <Switch
          checked={value.enabled}
          onCheckedChange={(checked) =>
            onChange({ ...value, enabled: checked })
          }
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Nome de exibição</Label>
          <Input
            value={value.displayName}
            onChange={(e) =>
              onChange({ ...value, displayName: e.target.value })
            }
            placeholder={`${title} Gateway`}
          />
        </div>
        <div className="space-y-2">
          <Label>Endpoint/Webhook</Label>
          <Input
            value={value.endpoint}
            onChange={(e) => onChange({ ...value, endpoint: e.target.value })}
            placeholder="https://..."
          />
        </div>
        <div className="space-y-2">
          <Label>Token do bot / access token</Label>
          <Input
            type="password"
            value={value.botToken}
            onChange={(e) => onChange({ ...value, botToken: e.target.value })}
            placeholder="Token"
          />
        </div>
        <div className="space-y-2">
          <Label>Secret / assinatura</Label>
          <Input
            type="password"
            value={value.secret}
            onChange={(e) => onChange({ ...value, secret: e.target.value })}
            placeholder="Signing secret / verify token"
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label>Destino padrão</Label>
          <Input
            value={value.defaultTarget}
            onChange={(e) =>
              onChange({ ...value, defaultTarget: e.target.value })
            }
            placeholder="chat id / canal / room / phone-id"
          />
        </div>
      </div>
    </div>
  );
}

export function NanobotSettingsPanel() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const settingsQuery = useQuery(trpc.nanobot.getSettings.queryOptions());
  const statusQuery = useQuery(trpc.nanobot.status.queryOptions());
  const toolsQuery = useQuery(trpc.nanobot.toolsManifest.queryOptions());

  const [form, setForm] = useState<NanobotSettingsForm | null>(null);
  const [saveMessage, setSaveMessage] = useState("");

  useEffect(() => {
    if (settingsQuery.data) {
      setForm(settingsQuery.data as NanobotSettingsForm);
    }
  }, [settingsQuery.data]);

  const updateMutation = useMutation(
    trpc.nanobot.updateSettings.mutationOptions({
      onSuccess: async (data) => {
        setSaveMessage("Configurações Nanobot salvas.");
        setForm(data as NanobotSettingsForm);
        await queryClient.invalidateQueries({
          queryKey: trpc.nanobot.getSettings.queryKey(),
        });
      },
      onError: (error) => {
        setSaveMessage(error.message);
      },
    }),
  );

  if (!form || settingsQuery.isLoading) {
    return <div className="text-sm text-muted-foreground">Carregando...</div>;
  }

  const status = statusQuery.data;
  const tools = toolsQuery.data?.tools ?? [];

  const setField = <K extends keyof NanobotSettingsForm>(
    key: K,
    value: NanobotSettingsForm[K],
  ) => setForm((prev) => (prev ? { ...prev, [key]: value } : prev));

  const setModelConfig = <K extends keyof NanobotSettingsForm["modelConfig"]>(
    key: K,
    value: NanobotSettingsForm["modelConfig"][K],
  ) =>
    setForm((prev) =>
      prev
        ? {
            ...prev,
            modelConfig: { ...prev.modelConfig, [key]: value },
          }
        : prev,
    );

  const setSoulConfig = <K extends keyof NanobotSettingsForm["soulConfig"]>(
    key: K,
    value: NanobotSettingsForm["soulConfig"][K],
  ) =>
    setForm((prev) =>
      prev
        ? { ...prev, soulConfig: { ...prev.soulConfig, [key]: value } }
        : prev,
    );

  const setAgentCmdConfig = <
    K extends keyof NanobotSettingsForm["agentCmdConfig"],
  >(
    key: K,
    value: NanobotSettingsForm["agentCmdConfig"][K],
  ) =>
    setForm((prev) =>
      prev
        ? {
            ...prev,
            agentCmdConfig: { ...prev.agentCmdConfig, [key]: value },
          }
        : prev,
    );

  const setMemoryConfig = <K extends keyof NanobotSettingsForm["memoryConfig"]>(
    key: K,
    value: NanobotSettingsForm["memoryConfig"][K],
  ) =>
    setForm((prev) =>
      prev
        ? {
            ...prev,
            memoryConfig: { ...prev.memoryConfig, [key]: value },
          }
        : prev,
    );

  const setSkillsConfig = <K extends keyof NanobotSettingsForm["skillsConfig"]>(
    key: K,
    value: NanobotSettingsForm["skillsConfig"][K],
  ) =>
    setForm((prev) =>
      prev
        ? {
            ...prev,
            skillsConfig: { ...prev.skillsConfig, [key]: value },
          }
        : prev,
    );

  const setAutomationConfig = <
    K extends keyof NanobotSettingsForm["automationConfig"],
  >(
    key: K,
    value: NanobotSettingsForm["automationConfig"][K],
  ) =>
    setForm((prev) =>
      prev
        ? {
            ...prev,
            automationConfig: { ...prev.automationConfig, [key]: value },
          }
        : prev,
    );

  const setGateway = (
    channel: keyof NanobotSettingsForm["gatewayConfig"],
    value: GatewayConfig,
  ) =>
    setForm((prev) => {
      if (!prev) return prev;

      const next = {
        ...prev,
        gatewayConfig: { ...prev.gatewayConfig, [channel]: value },
      };

      if (channel === "whatsapp") {
        next.channels.whatsappEnabled = value.enabled;
      } else if (channel === "telegram") {
        next.channels.telegramEnabled = value.enabled;
      } else if (channel === "slack") {
        next.channels.slackEnabled = value.enabled;
      }

      return { ...next, channels: { ...next.channels } };
    });

  const save = () => {
    setSaveMessage("");
    updateMutation.mutate({
      ...form,
      provider: form.modelConfig.provider,
      model: form.modelConfig.model,
      soul: form.soulConfig.content,
      agentCmd: form.agentCmdConfig.content,
      memoryNotes: form.memoryConfig.notes,
      channels: {
        whatsappEnabled: form.gatewayConfig.whatsapp.enabled,
        telegramEnabled: form.gatewayConfig.telegram.enabled,
        slackEnabled: form.gatewayConfig.slack.enabled,
      },
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>Nanobot Runtime</CardTitle>
            <Badge
              variant={status?.engine === "nanobot" ? "default" : "secondary"}
            >
              {status?.engine === "nanobot"
                ? "Ativo no /chat"
                : "Engine atual: legado"}
            </Badge>
            {status?.fallbackToLegacy && (
              <Badge variant="outline">Fallback p/ legado</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Refatoração sem mudar UX/UI: o frontend continua igual, mas o
            backend do agente passa a ser o Nanobot.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <ToggleRow
              label="Habilitar Nanobot neste time"
              description="Ativa a configuração da equipe; a troca global de engine ainda pode ser controlada por env."
              checked={form.enabled}
              onCheckedChange={(checked) => setField("enabled", checked)}
            />
            <ToggleRow
              label="Fallback automático para o agente legado"
              description="Se o runtime do Nanobot falhar, o `/chat` volta para o agente anterior."
              checked={form.fallbackToLegacy}
              onCheckedChange={(checked) =>
                setField("fallbackToLegacy", checked)
              }
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>URL base do runtime Nanobot</Label>
              <Input
                value={form.baseUrl}
                onChange={(e) => setField("baseUrl", e.target.value)}
                placeholder="http://127.0.0.1:xxxx"
              />
            </div>
            <div className="space-y-2">
              <Label>Path do endpoint de chat do Nanobot</Label>
              <Input
                value={form.chatPath}
                onChange={(e) => setField("chatPath", e.target.value)}
                placeholder="/api/chat"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Chave API do Nanobot (por time)</Label>
              <Input
                type="password"
                value={form.apiKey}
                onChange={(e) => setField("apiKey", e.target.value)}
                placeholder="Opcional: sobrescrever a chave padrão"
              />
              <p className="text-xs text-muted-foreground">
                Temporariamente armazenada em `teams.export_settings.nanobot`.
                Depois migramos para storage seguro de segredos.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Section
        title="Configurações de Modelo (Nanobot)"
        description="Configuração explícita de provedor/modelo e parâmetros de inferência usados pelo runtime."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Provider do modelo</Label>
            <Input
              value={form.modelConfig.provider}
              onChange={(e) => setModelConfig("provider", e.target.value)}
              placeholder="openai / openrouter / anthropic / google..."
            />
          </div>
          <div className="space-y-2">
            <Label>Modelo</Label>
            <Input
              value={form.modelConfig.model}
              onChange={(e) => setModelConfig("model", e.target.value)}
              placeholder="gpt-4o-mini / claude / gemini..."
            />
          </div>
          <div className="space-y-2">
            <Label>Temperature</Label>
            <Input
              type="number"
              step="0.1"
              min="0"
              max="2"
              value={form.modelConfig.temperature ?? ""}
              onChange={(e) =>
                setModelConfig(
                  "temperature",
                  parseNullableNumber(e.target.value),
                )
              }
              placeholder="0.2"
            />
          </div>
          <div className="space-y-2">
            <Label>Top P</Label>
            <Input
              type="number"
              step="0.05"
              min="0"
              max="1"
              value={form.modelConfig.topP ?? ""}
              onChange={(e) =>
                setModelConfig("topP", parseNullableNumber(e.target.value))
              }
              placeholder="1.0"
            />
          </div>
          <div className="space-y-2">
            <Label>Max tokens</Label>
            <Input
              type="number"
              min="1"
              value={form.modelConfig.maxTokens ?? ""}
              onChange={(e) =>
                setModelConfig("maxTokens", parseNullableNumber(e.target.value))
              }
              placeholder="4096"
            />
          </div>
          <div className="space-y-2">
            <Label>Reasoning effort</Label>
            <Input
              value={form.modelConfig.reasoningEffort}
              onChange={(e) =>
                setModelConfig(
                  "reasoningEffort",
                  (["", "low", "medium", "high"].includes(e.target.value)
                    ? e.target.value
                    : "") as NanobotSettingsForm["modelConfig"]["reasoningEffort"],
                )
              }
              placeholder="low / medium / high"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Modo de stream do runtime</Label>
            <Input
              value={form.modelConfig.streamMode}
              onChange={(e) =>
                setModelConfig(
                  "streamMode",
                  (["auto", "sse", "json"].includes(e.target.value)
                    ? e.target.value
                    : "auto") as NanobotSettingsForm["modelConfig"]["streamMode"],
                )
              }
              placeholder="auto / sse / json"
            />
          </div>
        </div>
      </Section>

      <Section
        title="Soul (Alma do Agente)"
        description="Arquivo editável de identidade, objetivos e postura do Nanobot para este time."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Versão/Tag do Soul</Label>
            <Input
              value={form.soulConfig.versionTag}
              onChange={(e) => setSoulConfig("versionTag", e.target.value)}
              placeholder="v1 / produção / campanha-abril"
            />
          </div>
          <ToggleRow
            label="Soul editável"
            description="Permite edição do arquivo Soul nesta equipe."
            checked={form.soulConfig.editable}
            onCheckedChange={(checked) => setSoulConfig("editable", checked)}
          />
          <div className="space-y-2 md:col-span-2">
            <Label>Conteúdo do Soul</Label>
            <Textarea
              value={form.soulConfig.content}
              onChange={(e) => setSoulConfig("content", e.target.value)}
              className="min-h-36"
              placeholder="Persona, objetivos, estilo de resposta, limitações..."
            />
          </div>
        </div>
      </Section>

      <Section
        title="Agent CMD / Instruções Persistentes"
        description="Arquivo de comandos do agente, instruções de boot e manutenção operacional."
      >
        <div className="space-y-4">
          <ToggleRow
            label="Permitir autoedição do Agent CMD"
            description="Quando ligado, o Nanobot pode alterar o próprio CMD (use com cuidado)."
            checked={form.agentCmdConfig.allowSelfEdit}
            onCheckedChange={(checked) =>
              setAgentCmdConfig("allowSelfEdit", checked)
            }
          />
          <div className="space-y-2">
            <Label>Arquivo Agent CMD (principal)</Label>
            <Textarea
              value={form.agentCmdConfig.content}
              onChange={(e) => setAgentCmdConfig("content", e.target.value)}
              className="min-h-32"
              placeholder="Instruções persistentes do agente..."
            />
          </div>
          <div className="space-y-2">
            <Label>Instruções de inicialização (startup)</Label>
            <Textarea
              value={form.agentCmdConfig.startupInstructions}
              onChange={(e) =>
                setAgentCmdConfig("startupInstructions", e.target.value)
              }
              className="min-h-24"
              placeholder="Rotinas de boot, checagens e carregamento..."
            />
          </div>
          <div className="space-y-2">
            <Label>Instruções de manutenção / registros</Label>
            <Textarea
              value={form.agentCmdConfig.maintenanceInstructions}
              onChange={(e) =>
                setAgentCmdConfig("maintenanceInstructions", e.target.value)
              }
              className="min-h-24"
              placeholder="Como registrar mudanças, logs, auditoria..."
            />
          </div>
        </div>
      </Section>

      <Section
        title="Memória Persistente"
        description="Configuração explícita de memória do Nanobot (persistência, auto-modificação e sumarização)."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <ToggleRow
            label="Memória habilitada"
            description="Liga o subsistema de memória do Nanobot."
            checked={form.memoryConfig.enabled}
            onCheckedChange={(checked) => setMemoryConfig("enabled", checked)}
          />
          <ToggleRow
            label="Memória persistente"
            description="Mantém estado entre sessões, além do histórico do chat."
            checked={form.memoryConfig.persistent}
            onCheckedChange={(checked) =>
              setMemoryConfig("persistent", checked)
            }
          />
          <ToggleRow
            label="Auto-modificação de memória"
            description="Permite o agente atualizar a própria memória estruturada."
            checked={form.memoryConfig.selfModifyEnabled}
            onCheckedChange={(checked) =>
              setMemoryConfig("selfModifyEnabled", checked)
            }
          />
          <ToggleRow
            label="Sumarização automática"
            description="Consolida memória em resumos para reduzir contexto."
            checked={form.memoryConfig.summarizationEnabled}
            onCheckedChange={(checked) =>
              setMemoryConfig("summarizationEnabled", checked)
            }
          />
          <div className="space-y-2">
            <Label>Backend de memória</Label>
            <Input
              value={form.memoryConfig.backend}
              onChange={(e) => setMemoryConfig("backend", e.target.value)}
              placeholder="redis / sqlite / vector / custom"
            />
          </div>
          <div className="space-y-2">
            <Label>Namespace de memória</Label>
            <Input
              value={form.memoryConfig.namespace}
              onChange={(e) => setMemoryConfig("namespace", e.target.value)}
              placeholder="team-xyz / poker-agent"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Máximo de entradas (opcional)</Label>
            <Input
              type="number"
              min="1"
              value={form.memoryConfig.maxEntries ?? ""}
              onChange={(e) =>
                setMemoryConfig(
                  "maxEntries",
                  parseNullableNumber(e.target.value),
                )
              }
              placeholder="1000"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Notas de memória / preferências persistentes</Label>
            <Textarea
              value={form.memoryConfig.notes}
              onChange={(e) => setMemoryConfig("notes", e.target.value)}
              className="min-h-28"
              placeholder="Regras de retenção, entidades importantes, preferências..."
            />
          </div>
        </div>
      </Section>

      <Section
        title="Skills do Nanobot"
        description="Controle de skills, autodiscovery e permissões para auto-instalação/registro."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <ToggleRow
            label="Skills habilitadas"
            description="Permite o Nanobot usar o sistema de skills."
            checked={form.skillsConfig.enabled}
            onCheckedChange={(checked) => setSkillsConfig("enabled", checked)}
          />
          <ToggleRow
            label="Auto-discovery de skills"
            description="Descobrir skills disponíveis automaticamente."
            checked={form.skillsConfig.autoDiscover}
            onCheckedChange={(checked) =>
              setSkillsConfig("autoDiscover", checked)
            }
          />
          <ToggleRow
            label="Permitir auto-instalar skills"
            description="Nanobot pode instalar skills novas sem intervenção manual."
            checked={form.skillsConfig.allowSelfInstall}
            onCheckedChange={(checked) =>
              setSkillsConfig("allowSelfInstall", checked)
            }
          />
          <ToggleRow
            label="Permitir auto-atualizar skills"
            description="Nanobot pode atualizar skills já instaladas."
            checked={form.skillsConfig.allowSelfUpdate}
            onCheckedChange={(checked) =>
              setSkillsConfig("allowSelfUpdate", checked)
            }
          />
          <ToggleRow
            label="Permitir auto-registrar skills"
            description="Nanobot pode registrar/adicionar as próprias skills."
            checked={form.skillsConfig.allowSelfRegister}
            onCheckedChange={(checked) =>
              setSkillsConfig("allowSelfRegister", checked)
            }
          />
          <div />
          <div className="space-y-2">
            <Label>Skills fixas (uma por linha)</Label>
            <Textarea
              value={form.skillsConfig.pinnedSkillsText}
              onChange={(e) =>
                setSkillsConfig("pinnedSkillsText", e.target.value)
              }
              className="min-h-28"
              placeholder={"finance\nchrome_tasks\ntelegram_gateway"}
            />
          </div>
          <div className="space-y-2">
            <Label>Skills bloqueadas (uma por linha)</Label>
            <Textarea
              value={form.skillsConfig.blockedSkillsText}
              onChange={(e) =>
                setSkillsConfig("blockedSkillsText", e.target.value)
              }
              className="min-h-28"
              placeholder={"dangerous_shell\nexternal_publish"}
            />
          </div>
        </div>
      </Section>

      <Section
        title="Automações, Chrome e Tarefas Agendadas"
        description="Configurações explícitas do módulo de automações do Nanobot (Chrome tasks, agendamentos e concorrência)."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <ToggleRow
            label="Chrome Tasks habilitadas"
            description="Permite automações em navegador/Chrome."
            checked={form.automationConfig.chromeTasksEnabled}
            onCheckedChange={(checked) =>
              setAutomationConfig("chromeTasksEnabled", checked)
            }
          />
          <ToggleRow
            label="Tarefas agendadas habilitadas"
            description="Permite jobs/schedules automáticos."
            checked={form.automationConfig.scheduledTasksEnabled}
            onCheckedChange={(checked) =>
              setAutomationConfig("scheduledTasksEnabled", checked)
            }
          />
          <ToggleRow
            label="Permitir browser automation"
            description="Habilita ações de navegação/execução web no runtime."
            checked={form.automationConfig.allowBrowserAutomation}
            onCheckedChange={(checked) =>
              setAutomationConfig("allowBrowserAutomation", checked)
            }
          />
          <div className="space-y-2">
            <Label>Timezone da automação</Label>
            <Input
              value={form.automationConfig.timezone}
              onChange={(e) => setAutomationConfig("timezone", e.target.value)}
              placeholder="America/Sao_Paulo"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Máximo de jobs concorrentes (opcional)</Label>
            <Input
              type="number"
              min="1"
              value={form.automationConfig.maxConcurrentJobs ?? ""}
              onChange={(e) =>
                setAutomationConfig(
                  "maxConcurrentJobs",
                  parseNullableNumber(e.target.value),
                )
              }
              placeholder="3"
            />
          </div>
        </div>
      </Section>

      <Section
        title="Gateways (WhatsApp, Telegram e Slack)"
        description="Configuração específica dos gateways suportados nesta fase da migração."
      >
        <div className="space-y-4">
          <GatewayCard
            title="WhatsApp"
            subtitle="Gateway oficial/integrado do Nanobot"
            value={form.gatewayConfig.whatsapp}
            onChange={(next) => setGateway("whatsapp", next)}
          />
          <GatewayCard
            title="Telegram"
            subtitle="Bot/updates/webhook do Telegram"
            value={form.gatewayConfig.telegram}
            onChange={(next) => setGateway("telegram", next)}
          />
          <GatewayCard
            title="Slack"
            subtitle="Bot token, signing secret e canal padrão"
            value={form.gatewayConfig.slack}
            onChange={(next) => setGateway("slack", next)}
          />
        </div>
      </Section>

      <Section
        title="Tools Legadas (compatibilidade)"
        description="Manifesto das tools atuais expostas para o runtime do Nanobot, preservando tool names/canvas/UX."
      >
        <div className="flex flex-wrap gap-2">
          {tools.slice(0, 20).map((tool) => (
            <Badge key={tool.name} variant="secondary">
              {tool.name}
            </Badge>
          ))}
          {tools.length > 20 && (
            <Badge variant="outline">+{tools.length - 20} tools</Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Total: {tools.length} tools. Endpoints: `GET /nanobot/tools` e `POST
          /nanobot/tools/invoke`.
        </p>
      </Section>

      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={updateMutation.isPending}>
          {updateMutation.isPending ? "Salvando..." : "Salvar"}
        </Button>
        {saveMessage && (
          <span className="text-sm text-muted-foreground">{saveMessage}</span>
        )}
      </div>
    </div>
  );
}
