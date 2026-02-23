"use client";

import type { ParsedSummary } from "@/lib/poker/types";
import { useTRPC } from "@/trpc/client";
import { Badge } from "@midpoker/ui/badge";
import { Button } from "@midpoker/ui/button";
import { Checkbox } from "@midpoker/ui/checkbox";
import { cn } from "@midpoker/ui/cn";
import { Icons } from "@midpoker/ui/icons";
import { Input } from "@midpoker/ui/input";
import { Spinner } from "@midpoker/ui/spinner";
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

// Entity type colors
const ENTITY_COLORS = {
  players: "#3B82F6",
  agents: "#8B5CF6",
  superAgents: "#10B981",
} as const;

export function CadastroTab({ summaries }: CadastroTabProps) {
  const trpc = useTRPC();
  const [activeSubTab, setActiveSubTab] = useState<
    "players" | "agents" | "superAgents"
  >("players");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [registrationComplete, setRegistrationComplete] = useState(false);
  const [registrationResult, setRegistrationResult] = useState<{
    created: number;
    errors: Array<{ ppPokerId: string; error: string }>;
  } | null>(null);
  const [showExisting, setShowExisting] = useState(false);

  // Extract unique entities from summaries
  const { players, agents, superAgents, allPpPokerIds } = useMemo(() => {
    const playerMap = new Map<string, ExtractedEntity>();
    const agentMap = new Map<string, ExtractedEntity>();
    const superAgentMap = new Map<string, ExtractedEntity>();

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

      if (
        isValidId(summary.superAgentPpPokerId) &&
        summary.superAgentNickname
      ) {
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
    trpc.poker.players.checkExistingByPpPokerIds.queryOptions(
      { ppPokerIds: allPpPokerIds },
      { enabled: allPpPokerIds.length > 0 },
    ),
  );

  // Bulk create mutation
  const bulkCreateMutation = useMutation(
    trpc.poker.players.bulkCreate.mutationOptions({
      onSuccess: (result) => {
        setRegistrationComplete(true);
        setRegistrationResult(result);
        setSelectedIds(new Set());
      },
    }),
  );

  // Merge existing data with extracted entities
  const { enrichedPlayers, enrichedAgents, enrichedSuperAgents } =
    useMemo(() => {
      const existingSet = new Set(
        existingData?.existing.map((e) => e.ppPokerId) ?? [],
      );
      const existingMap = new Map(
        existingData?.existing.map((e) => [e.ppPokerId, e]) ?? [],
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

  // Filter entities
  const filterEntities = (
    entities: ExtractedEntity[],
    onlyNew = true,
  ): ExtractedEntity[] => {
    return entities.filter((entity) => {
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

  // Get current tab entities
  const getCurrentEntities = () => {
    switch (activeSubTab) {
      case "players":
        return { new: newPlayers, existing: existingPlayers };
      case "agents":
        return { new: newAgents, existing: existingAgents };
      case "superAgents":
        return { new: newSuperAgents, existing: existingSuperAgents };
    }
  };

  const currentEntities = getCurrentEntities();

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
    const allIds = currentEntities.new.map((e) => e.ppPokerId);
    const allSelected = allIds.every((id) => selectedIds.has(id));

    if (allSelected) {
      const newSelected = new Set(selectedIds);
      for (const id of allIds) newSelected.delete(id);
      setSelectedIds(newSelected);
    } else {
      const newSelected = new Set(selectedIds);
      for (const id of allIds) newSelected.add(id);
      setSelectedIds(newSelected);
    }
  };

  // Handle bulk registration
  const handleBulkRegister = () => {
    const entitiesToRegister: ExtractedEntity[] = [];

    for (const entity of enrichedSuperAgents) {
      if (selectedIds.has(entity.ppPokerId) && entity.isNew)
        entitiesToRegister.push(entity);
    }
    for (const entity of enrichedAgents) {
      if (selectedIds.has(entity.ppPokerId) && entity.isNew)
        entitiesToRegister.push(entity);
    }
    for (const entity of enrichedPlayers) {
      if (selectedIds.has(entity.ppPokerId) && entity.isNew)
        entitiesToRegister.push(entity);
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
      <p className="text-center text-muted-foreground py-8">
        Nenhum dado encontrado na aba Geral para processar cadastros
      </p>
    );
  }

  if (isCheckingExisting) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <Spinner size={32} />
        <p className="text-sm text-muted-foreground">
          Verificando jogadores existentes...
        </p>
      </div>
    );
  }

  const totalNew = newPlayers.length + newAgents.length + newSuperAgents.length;
  const totalExisting =
    existingPlayers.length + existingAgents.length + existingSuperAgents.length;
  const selectedCount = selectedIds.size;

  return (
    <div className="space-y-3 pb-4">
      {/* Registration Complete Message */}
      {registrationComplete && registrationResult && (
        <div className="flex items-center gap-2 py-2 text-xs">
          <Icons.Check className="w-3.5 h-3.5 text-[#00C969]" />
          <span className="text-[#00C969] font-medium">
            {registrationResult.created} cadastrado(s)
          </span>
          {registrationResult.errors.length > 0 && (
            <span className="text-[#FF3638]">
              · {registrationResult.errors.length} erro(s)
            </span>
          )}
        </div>
      )}

      {/* Row 1: Counters */}
      <div className="flex items-center gap-4 text-xs py-2">
        <span className="text-muted-foreground">
          Na Planilha{" "}
          <span className="text-foreground font-medium">
            {players.length + agents.length + superAgents.length}
          </span>
        </span>
        <span className="text-border/60">·</span>
        <span className="text-muted-foreground">
          Novos <span className="text-[#00C969] font-medium">{totalNew}</span>
        </span>
        <span className="text-border/60">·</span>
        <span className="text-muted-foreground">
          Existentes{" "}
          <span className="text-foreground font-medium">{totalExisting}</span>
        </span>
        <span className="text-border/60">·</span>
        <span className="text-muted-foreground">
          Selecionados{" "}
          <span className="text-foreground font-medium">{selectedCount}</span>
        </span>
      </div>

      {/* Row 2: Entity type tabs with colored dots */}
      <div className="border-t border-border/40 py-2">
        <div className="flex items-center gap-3 flex-wrap text-xs">
          <button
            type="button"
            onClick={() => setActiveSubTab("players")}
            className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded transition-colors hover:bg-muted/50",
              activeSubTab === "players" && "bg-muted/50",
            )}
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: ENTITY_COLORS.players }}
            />
            <span className="text-muted-foreground">Jogadores</span>
            <span className="text-foreground font-medium">
              {newPlayers.length}
            </span>
            {existingPlayers.length > 0 && (
              <span className="text-[9px] text-muted-foreground">
                (+{existingPlayers.length})
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab("agents")}
            className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded transition-colors hover:bg-muted/50",
              activeSubTab === "agents" && "bg-muted/50",
            )}
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: ENTITY_COLORS.agents }}
            />
            <span className="text-muted-foreground">Agentes</span>
            <span className="text-foreground font-medium">
              {newAgents.length}
            </span>
            {existingAgents.length > 0 && (
              <span className="text-[9px] text-muted-foreground">
                (+{existingAgents.length})
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab("superAgents")}
            className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded transition-colors hover:bg-muted/50",
              activeSubTab === "superAgents" && "bg-muted/50",
            )}
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: ENTITY_COLORS.superAgents }}
            />
            <span className="text-muted-foreground">Super Agentes</span>
            <span className="text-foreground font-medium">
              {newSuperAgents.length}
            </span>
            {existingSuperAgents.length > 0 && (
              <span className="text-[9px] text-muted-foreground">
                (+{existingSuperAgents.length})
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Row 3: Actions */}
      <div className="border-t border-border/40 flex items-center justify-between py-2">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={selectAllNew}
            disabled={totalNew === 0}
            className="h-6 px-2 text-xs"
          >
            Selecionar todos novos
          </Button>
          <Button
            size="sm"
            onClick={handleBulkRegister}
            disabled={selectedCount === 0 || bulkCreateMutation.isPending}
            className="h-6 px-2 text-xs"
          >
            {bulkCreateMutation.isPending ? (
              <>
                <Spinner size={12} className="mr-1" />
                Cadastrando...
              </>
            ) : (
              <>
                <Icons.Add className="w-3 h-3 mr-1" />
                Cadastrar ({selectedCount})
              </>
            )}
          </Button>
          {currentEntities.existing.length > 0 && (
            <button
              type="button"
              onClick={() => setShowExisting(!showExisting)}
              className="text-[10px] text-muted-foreground hover:text-foreground"
            >
              {showExisting ? "Ocultar" : "Mostrar"} existentes (
              {currentEntities.existing.length})
            </button>
          )}
        </div>
        <div className="relative w-48">
          <Icons.Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-7 h-7 text-xs"
          />
        </div>
      </div>

      {/* Data table - New entities */}
      <div className="border-t border-border/40 pt-2 pb-4">
        <EntityTable
          entities={currentEntities.new}
          selectedIds={selectedIds}
          onToggleSelection={toggleSelection}
          onToggleAll={toggleAll}
          type={activeSubTab}
        />
      </div>

      {/* Existing entities (collapsible) */}
      {showExisting && currentEntities.existing.length > 0 && (
        <div className="border-t border-border/40 pt-2 mt-2">
          <p className="text-[10px] text-muted-foreground mb-2">
            Já cadastrados ({currentEntities.existing.length})
          </p>
          <EntityTable
            entities={currentEntities.existing}
            selectedIds={new Set()}
            onToggleSelection={() => {}}
            onToggleAll={() => {}}
            type={activeSubTab}
            readonly
          />
        </div>
      )}
    </div>
  );
}

// Entity table component
type EntityTableProps = {
  entities: ExtractedEntity[];
  selectedIds: Set<string>;
  onToggleSelection: (ppPokerId: string) => void;
  onToggleAll: () => void;
  type: "players" | "agents" | "superAgents";
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
    const label =
      type === "players"
        ? "jogador"
        : type === "agents"
          ? "agente"
          : "super agente";
    return (
      <div className="text-center py-6 text-xs text-muted-foreground">
        {readonly
          ? "Nenhum registro existente"
          : `Nenhum ${label} novo para cadastrar`}
      </div>
    );
  }

  const allSelected =
    entities.length > 0 && entities.every((e) => selectedIds.has(e.ppPokerId));
  const someSelected =
    entities.some((e) => selectedIds.has(e.ppPokerId)) && !allSelected;

  return (
    <div className="overflow-x-auto max-h-[280px]">
      <table className="w-full text-xs min-w-[600px]">
        <thead className="sticky top-0 z-10 bg-background">
          <tr className="text-muted-foreground border-b border-border/40">
            {!readonly && (
              <th className="py-1.5 px-2 w-8">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={onToggleAll}
                  className={cn("h-3.5 w-3.5", someSelected && "opacity-50")}
                />
              </th>
            )}
            <th className="py-1.5 px-2 font-medium text-left whitespace-nowrap">
              Status
            </th>
            <th className="py-1.5 px-2 font-medium text-left whitespace-nowrap">
              ID PPPoker
            </th>
            <th className="py-1.5 px-2 font-medium text-left whitespace-nowrap">
              Apelido
            </th>
            <th className="py-1.5 px-2 font-medium text-left whitespace-nowrap">
              Memorando
            </th>
            <th className="py-1.5 px-2 font-medium text-left whitespace-nowrap">
              País
            </th>
            {type === "players" && (
              <>
                <th className="py-1.5 px-2 font-medium text-left whitespace-nowrap">
                  Agente
                </th>
                <th className="py-1.5 px-2 font-medium text-left whitespace-nowrap">
                  Super Ag.
                </th>
              </>
            )}
            {type === "agents" && (
              <th className="py-1.5 px-2 font-medium text-left whitespace-nowrap">
                Super Ag.
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/30">
          {entities.map((entity) => (
            <tr
              key={entity.ppPokerId}
              className={cn(
                "hover:bg-muted/30",
                selectedIds.has(entity.ppPokerId) && "bg-primary/5",
              )}
            >
              {!readonly && (
                <td className="py-1.5 px-2">
                  <Checkbox
                    checked={selectedIds.has(entity.ppPokerId)}
                    onCheckedChange={() => onToggleSelection(entity.ppPokerId)}
                    className="h-3.5 w-3.5"
                  />
                </td>
              )}
              <td className="py-1.5 px-2">
                {entity.isNew ? (
                  <span className="text-[9px] text-[#00C969] font-medium">
                    Novo
                  </span>
                ) : (
                  <span className="text-[9px] text-blue-500 font-medium">
                    Existente
                  </span>
                )}
              </td>
              <td className="py-1.5 px-2 font-mono text-[10px] text-muted-foreground whitespace-nowrap">
                {entity.ppPokerId}
              </td>
              <td className="py-1.5 px-2 whitespace-nowrap">
                {entity.nickname}
              </td>
              <td className="py-1.5 px-2 text-muted-foreground whitespace-nowrap">
                {entity.memoName || "-"}
              </td>
              <td className="py-1.5 px-2 text-muted-foreground whitespace-nowrap">
                {entity.country || "-"}
              </td>
              {type === "players" && (
                <>
                  <td className="py-1.5 px-2 font-mono text-[10px] text-muted-foreground whitespace-nowrap">
                    {entity.agentPpPokerId || "-"}
                  </td>
                  <td className="py-1.5 px-2 font-mono text-[10px] text-muted-foreground whitespace-nowrap">
                    {entity.superAgentPpPokerId || "-"}
                  </td>
                </>
              )}
              {type === "agents" && (
                <td className="py-1.5 px-2 font-mono text-[10px] text-muted-foreground whitespace-nowrap">
                  {entity.superAgentPpPokerId || "-"}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
