"use client";

import type { ParsedSummary } from "@/lib/poker/types";
import { useTRPC } from "@/trpc/client";
import { Badge } from "@midday/ui/badge";
import { Button } from "@midday/ui/button";
import { Checkbox } from "@midday/ui/checkbox";
import { Icons } from "@midday/ui/icons";
import { Input } from "@midday/ui/input";
import { Spinner } from "@midday/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@midday/ui/tabs";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

type CadastroTabProps = {
  summaries: ParsedSummary[];
};

type ExtractedEntity = {
  ppPokerId: string;
  nickname: string;
  memoName: string | null;
  country: string | null;
  type: "player" | "agent";
  agentPpPokerId: string | null;
  superAgentPpPokerId: string | null;
  isNew?: boolean;
  existingId?: string;
  existingStatus?: string;
};

export function CadastroTab({ summaries }: CadastroTabProps) {
  const trpc = useTRPC();
  const [activeSubTab, setActiveSubTab] = useState("players");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [registrationComplete, setRegistrationComplete] = useState(false);
  const [registrationResult, setRegistrationResult] = useState<{
    created: number;
    errors: Array<{ ppPokerId: string; error: string }>;
  } | null>(null);

  // Extract unique entities from summaries
  const { players, agents, superAgents, allPpPokerIds } = useMemo(() => {
    const playerMap = new Map<string, ExtractedEntity>();
    const agentMap = new Map<string, ExtractedEntity>();
    const superAgentMap = new Map<string, ExtractedEntity>();

    // Helper to check valid ID
    const isValidId = (id: string | null | undefined): id is string => {
      if (!id) return false;
      const normalized = id.trim().toLowerCase();
      return (
        normalized !== "" &&
        normalized !== "(none)" &&
        normalized !== "none" &&
        normalized !== "/" &&
        normalized !== "-" &&
        /\d/.test(id)
      );
    };

    for (const summary of summaries) {
      // Add player
      if (isValidId(summary.ppPokerId)) {
        playerMap.set(summary.ppPokerId, {
          ppPokerId: summary.ppPokerId,
          nickname: summary.nickname,
          memoName: summary.memoName,
          country: summary.country,
          type: "player",
          agentPpPokerId: isValidId(summary.agentPpPokerId)
            ? summary.agentPpPokerId
            : null,
          superAgentPpPokerId: isValidId(summary.superAgentPpPokerId)
            ? summary.superAgentPpPokerId
            : null,
        });
      }

      // Add agent
      if (isValidId(summary.agentPpPokerId) && summary.agentNickname) {
        agentMap.set(summary.agentPpPokerId, {
          ppPokerId: summary.agentPpPokerId,
          nickname: summary.agentNickname,
          memoName: null,
          country: null,
          type: "agent",
          agentPpPokerId: null,
          superAgentPpPokerId: isValidId(summary.superAgentPpPokerId)
            ? summary.superAgentPpPokerId
            : null,
        });
      }

      // Add super agent
      if (isValidId(summary.superAgentPpPokerId) && summary.superAgentNickname) {
        superAgentMap.set(summary.superAgentPpPokerId, {
          ppPokerId: summary.superAgentPpPokerId,
          nickname: summary.superAgentNickname,
          memoName: null,
          country: null,
          type: "agent",
          agentPpPokerId: null,
          superAgentPpPokerId: null,
        });
      }
    }

    const allIds = [
      ...playerMap.keys(),
      ...agentMap.keys(),
      ...superAgentMap.keys(),
    ];

    return {
      players: Array.from(playerMap.values()),
      agents: Array.from(agentMap.values()),
      superAgents: Array.from(superAgentMap.values()),
      allPpPokerIds: [...new Set(allIds)],
    };
  }, [summaries]);

  // Query to check existing players
  const { data: existingData, isLoading: isCheckingExisting } = useQuery(
    trpc.pokerPlayers.checkExistingByPpPokerIds.queryOptions(
      { ppPokerIds: allPpPokerIds },
      { enabled: allPpPokerIds.length > 0 }
    )
  );

  // Bulk create mutation
  const bulkCreateMutation = useMutation(
    trpc.pokerPlayers.bulkCreate.mutationOptions({
      onSuccess: (result) => {
        setRegistrationComplete(true);
        setRegistrationResult(result);
        setSelectedIds(new Set());
      },
    })
  );

  // Merge existing data with extracted entities
  const { enrichedPlayers, enrichedAgents, enrichedSuperAgents } =
    useMemo(() => {
      const existingSet = new Set(
        existingData?.existing.map((e) => e.ppPokerId) ?? []
      );
      const existingMap = new Map(
        existingData?.existing.map((e) => [e.ppPokerId, e]) ?? []
      );

      const enrichPlayer = (entity: ExtractedEntity): ExtractedEntity => {
        const existing = existingMap.get(entity.ppPokerId);
        return {
          ...entity,
          isNew: !existingSet.has(entity.ppPokerId),
          existingId: existing?.id,
          existingStatus: existing?.status,
        };
      };

      return {
        enrichedPlayers: players.map(enrichPlayer),
        enrichedAgents: agents.map(enrichPlayer),
        enrichedSuperAgents: superAgents.map(enrichPlayer),
      };
    }, [players, agents, superAgents, existingData]);

  // Filter entities based on search and new/existing filter
  const filterEntities = (
    entities: ExtractedEntity[],
    onlyNew = true
  ): ExtractedEntity[] => {
    return entities.filter((entity) => {
      // Only show new entities for registration
      if (onlyNew && !entity.isNew) return false;

      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        entity.ppPokerId.includes(query) ||
        entity.nickname.toLowerCase().includes(query) ||
        entity.memoName?.toLowerCase().includes(query)
      );
    });
  };

  const newPlayers = filterEntities(enrichedPlayers, true);
  const newAgents = filterEntities(enrichedAgents, true);
  const newSuperAgents = filterEntities(enrichedSuperAgents, true);

  const existingPlayers = enrichedPlayers.filter((e) => !e.isNew);
  const existingAgents = enrichedAgents.filter((e) => !e.isNew);
  const existingSuperAgents = enrichedSuperAgents.filter((e) => !e.isNew);

  // Get current tab entities for selection
  const getCurrentTabEntities = () => {
    switch (activeSubTab) {
      case "players":
        return newPlayers;
      case "agents":
        return newAgents;
      case "superAgents":
        return newSuperAgents;
      default:
        return [];
    }
  };

  const currentEntities = getCurrentTabEntities();

  // Toggle selection
  const toggleSelection = (ppPokerId: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(ppPokerId)) {
      newSelected.delete(ppPokerId);
    } else {
      newSelected.add(ppPokerId);
    }
    setSelectedIds(newSelected);
  };

  // Toggle all in current tab
  const toggleAll = () => {
    const allIds = currentEntities.map((e) => e.ppPokerId);
    const allSelected = allIds.every((id) => selectedIds.has(id));

    if (allSelected) {
      const newSelected = new Set(selectedIds);
      for (const id of allIds) {
        newSelected.delete(id);
      }
      setSelectedIds(newSelected);
    } else {
      const newSelected = new Set(selectedIds);
      for (const id of allIds) {
        newSelected.add(id);
      }
      setSelectedIds(newSelected);
    }
  };

  // Handle bulk registration
  const handleBulkRegister = () => {
    // Collect all entities to register
    const entitiesToRegister: ExtractedEntity[] = [];

    // First, add super agents (they need to exist before agents reference them)
    for (const entity of enrichedSuperAgents) {
      if (selectedIds.has(entity.ppPokerId) && entity.isNew) {
        entitiesToRegister.push(entity);
      }
    }

    // Then add agents (they need to exist before players reference them)
    for (const entity of enrichedAgents) {
      if (selectedIds.has(entity.ppPokerId) && entity.isNew) {
        entitiesToRegister.push(entity);
      }
    }

    // Finally add players
    for (const entity of enrichedPlayers) {
      if (selectedIds.has(entity.ppPokerId) && entity.isNew) {
        entitiesToRegister.push(entity);
      }
    }

    if (entitiesToRegister.length === 0) return;

    bulkCreateMutation.mutate({
      players: entitiesToRegister.map((e) => ({
        ppPokerId: e.ppPokerId,
        nickname: e.nickname,
        memoName: e.memoName,
        country: e.country,
        type: e.type,
        agentPpPokerId: e.agentPpPokerId,
        superAgentPpPokerId: e.superAgentPpPokerId,
      })),
    });
  };

  // Select all new entities
  const selectAllNew = () => {
    const allNewIds = [
      ...newPlayers.map((e) => e.ppPokerId),
      ...newAgents.map((e) => e.ppPokerId),
      ...newSuperAgents.map((e) => e.ppPokerId),
    ];
    setSelectedIds(new Set(allNewIds));
  };

  if (summaries.length === 0) {
    return (
      <p className="text-center text-[#878787] py-8">
        Nenhum dado encontrado na aba Geral para processar cadastros
      </p>
    );
  }

  if (isCheckingExisting) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <Spinner size={32} />
        <p className="text-sm text-muted-foreground">
          Verificando jogadores existentes no banco de dados...
        </p>
      </div>
    );
  }

  const totalNew = newPlayers.length + newAgents.length + newSuperAgents.length;
  const totalExisting =
    existingPlayers.length + existingAgents.length + existingSuperAgents.length;
  const selectedCount = selectedIds.size;

  return (
    <div className="space-y-4 pb-4">
      {/* Registration Complete Message */}
      {registrationComplete && registrationResult && (
        <div className="p-4 rounded-lg border border-[#00C969]/30 bg-[#00C969]/10">
          <div className="flex items-center gap-2 mb-2">
            <Icons.Check className="w-5 h-5 text-[#00C969]" />
            <p className="font-medium text-[#00C969]">Cadastro realizado!</p>
          </div>
          <p className="text-sm text-muted-foreground">
            {registrationResult.created} jogador(es) cadastrado(s) com sucesso.
          </p>
          {registrationResult.errors.length > 0 && (
            <div className="mt-2">
              <p className="text-sm text-[#FF3638]">
                {registrationResult.errors.length} erro(s):
              </p>
              <ul className="text-xs text-muted-foreground mt-1 space-y-0.5">
                {registrationResult.errors.slice(0, 5).map((err) => (
                  <li key={err.ppPokerId}>
                    {err.ppPokerId}: {err.error}
                  </li>
                ))}
                {registrationResult.errors.length > 5 && (
                  <li>... e mais {registrationResult.errors.length - 5}</li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 items-start">
        <div className="p-3 border rounded-lg bg-muted/30">
          <p className="text-xs text-muted-foreground">Na Planilha</p>
          <p className="text-xl font-semibold">
            {players.length + agents.length + superAgents.length}
          </p>
          <p className="text-[9px] text-muted-foreground mt-0.5">
            {players.length} jogadores · {agents.length} agentes ·{" "}
            {superAgents.length} super
          </p>
        </div>

        <div className="p-3 border rounded-lg bg-[#00C969]/10 border-[#00C969]/30">
          <p className="text-xs text-muted-foreground">Novos (não cadastrados)</p>
          <p className="text-xl font-semibold text-[#00C969]">{totalNew}</p>
          <p className="text-[9px] text-muted-foreground mt-0.5">
            {newPlayers.length} jogadores · {newAgents.length} agentes ·{" "}
            {newSuperAgents.length} super
          </p>
        </div>

        <div className="p-3 border rounded-lg bg-muted/30">
          <p className="text-xs text-muted-foreground">Já Cadastrados</p>
          <p className="text-xl font-semibold text-muted-foreground">
            {totalExisting}
          </p>
          <p className="text-[9px] text-muted-foreground mt-0.5">
            {existingPlayers.length} jogadores · {existingAgents.length} agentes ·{" "}
            {existingSuperAgents.length} super
          </p>
        </div>

        <div className="p-3 border rounded-lg bg-primary/10 border-primary/30">
          <p className="text-xs text-muted-foreground">Selecionados</p>
          <p className="text-xl font-semibold">{selectedCount}</p>
          <p className="text-[9px] text-muted-foreground mt-0.5">
            para cadastrar
          </p>
        </div>

        <div className="p-3 border rounded-lg flex flex-col gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={selectAllNew}
            disabled={totalNew === 0}
            className="text-xs"
          >
            Selecionar todos novos
          </Button>
          <Button
            size="sm"
            onClick={handleBulkRegister}
            disabled={selectedCount === 0 || bulkCreateMutation.isPending}
            className="text-xs"
          >
            {bulkCreateMutation.isPending ? (
              <>
                <Spinner size={14} className="mr-1" />
                Cadastrando...
              </>
            ) : (
              <>
                <Icons.Add className="w-3 h-3 mr-1" />
                Cadastrar ({selectedCount})
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#878787]" />
          <Input
            placeholder="Buscar por ID, apelido..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Tabs for entity types */}
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
        <TabsList className="bg-muted/30">
          <TabsTrigger value="players" className="gap-1.5">
            Jogadores
            {newPlayers.length > 0 && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 text-[#00C969] border-[#00C969]/30">
                {newPlayers.length} novos
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="agents" className="gap-1.5">
            Agentes
            {newAgents.length > 0 && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 text-[#00C969] border-[#00C969]/30">
                {newAgents.length} novos
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="superAgents" className="gap-1.5">
            Super Agentes
            {newSuperAgents.length > 0 && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 text-[#00C969] border-[#00C969]/30">
                {newSuperAgents.length} novos
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="players" className="mt-3">
          <EntityTable
            entities={newPlayers}
            selectedIds={selectedIds}
            onToggleSelection={toggleSelection}
            onToggleAll={toggleAll}
            type="player"
          />
          {existingPlayers.length > 0 && (
            <div className="mt-4">
              <p className="text-xs text-muted-foreground mb-2">
                Já cadastrados ({existingPlayers.length})
              </p>
              <EntityTable
                entities={existingPlayers}
                selectedIds={new Set()}
                onToggleSelection={() => {}}
                onToggleAll={() => {}}
                type="player"
                readonly
              />
            </div>
          )}
        </TabsContent>

        <TabsContent value="agents" className="mt-3">
          <EntityTable
            entities={newAgents}
            selectedIds={selectedIds}
            onToggleSelection={toggleSelection}
            onToggleAll={toggleAll}
            type="agent"
          />
          {existingAgents.length > 0 && (
            <div className="mt-4">
              <p className="text-xs text-muted-foreground mb-2">
                Já cadastrados ({existingAgents.length})
              </p>
              <EntityTable
                entities={existingAgents}
                selectedIds={new Set()}
                onToggleSelection={() => {}}
                onToggleAll={() => {}}
                type="agent"
                readonly
              />
            </div>
          )}
        </TabsContent>

        <TabsContent value="superAgents" className="mt-3">
          <EntityTable
            entities={newSuperAgents}
            selectedIds={selectedIds}
            onToggleSelection={toggleSelection}
            onToggleAll={toggleAll}
            type="superAgent"
          />
          {existingSuperAgents.length > 0 && (
            <div className="mt-4">
              <p className="text-xs text-muted-foreground mb-2">
                Já cadastrados ({existingSuperAgents.length})
              </p>
              <EntityTable
                entities={existingSuperAgents}
                selectedIds={new Set()}
                onToggleSelection={() => {}}
                onToggleAll={() => {}}
                type="superAgent"
                readonly
              />
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Entity table component
type EntityTableProps = {
  entities: ExtractedEntity[];
  selectedIds: Set<string>;
  onToggleSelection: (ppPokerId: string) => void;
  onToggleAll: () => void;
  type: "player" | "agent" | "superAgent";
  readonly?: boolean;
};

function EntityTable({
  entities,
  selectedIds,
  onToggleSelection,
  onToggleAll,
  type,
  readonly = false,
}: EntityTableProps) {
  if (entities.length === 0) {
    return (
      <div className="text-center py-6 text-sm text-muted-foreground border rounded-lg bg-muted/20">
        {readonly
          ? "Nenhum registro existente"
          : `Nenhum ${type === "player" ? "jogador" : type === "agent" ? "agente" : "super agente"} novo para cadastrar`}
      </div>
    );
  }

  const allSelected =
    entities.length > 0 &&
    entities.every((e) => selectedIds.has(e.ppPokerId));
  const someSelected =
    entities.some((e) => selectedIds.has(e.ppPokerId)) && !allSelected;

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="overflow-x-auto max-h-[300px]">
        <table className="w-full text-xs">
          <thead className="sticky top-0 z-10">
            <tr className="border-b bg-muted/50">
              {!readonly && (
                <th className="p-2 w-10">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={onToggleAll}
                    className={someSelected ? "opacity-50" : ""}
                  />
                </th>
              )}
              <th className="p-2 text-left font-medium">Status</th>
              <th className="p-2 text-left font-medium">ID PPPoker</th>
              <th className="p-2 text-left font-medium">Apelido</th>
              <th className="p-2 text-left font-medium">Memorando</th>
              <th className="p-2 text-left font-medium">País</th>
              {type === "player" && (
                <>
                  <th className="p-2 text-left font-medium">Agente</th>
                  <th className="p-2 text-left font-medium">Super Agente</th>
                </>
              )}
              {type === "agent" && (
                <th className="p-2 text-left font-medium">Super Agente</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y">
            {entities.map((entity) => (
              <tr
                key={entity.ppPokerId}
                className={`hover:bg-muted/30 ${
                  selectedIds.has(entity.ppPokerId) ? "bg-primary/5" : ""
                }`}
              >
                {!readonly && (
                  <td className="p-2">
                    <Checkbox
                      checked={selectedIds.has(entity.ppPokerId)}
                      onCheckedChange={() => onToggleSelection(entity.ppPokerId)}
                    />
                  </td>
                )}
                <td className="p-2">
                  {entity.isNew ? (
                    <Badge
                      variant="outline"
                      className="text-[10px] px-1.5 py-0 h-4 text-[#00C969] border-[#00C969]/30"
                    >
                      Novo
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="text-[10px] px-1.5 py-0 h-4 text-blue-500 border-blue-500/30"
                    >
                      Existente
                    </Badge>
                  )}
                </td>
                <td className="p-2 font-mono text-[#878787]">
                  {entity.ppPokerId}
                </td>
                <td className="p-2">{entity.nickname}</td>
                <td className="p-2 text-muted-foreground">
                  {entity.memoName || "-"}
                </td>
                <td className="p-2 text-muted-foreground">
                  {entity.country || "-"}
                </td>
                {type === "player" && (
                  <>
                    <td className="p-2 font-mono text-[#878787] text-[10px]">
                      {entity.agentPpPokerId || "-"}
                    </td>
                    <td className="p-2 font-mono text-[#878787] text-[10px]">
                      {entity.superAgentPpPokerId || "-"}
                    </td>
                  </>
                )}
                {type === "agent" && (
                  <td className="p-2 font-mono text-[#878787] text-[10px]">
                    {entity.superAgentPpPokerId || "-"}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
