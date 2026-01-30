"use client";

import { useTRPC } from "@/trpc/client";
import { Badge } from "@midpoker/ui/badge";
import { Button } from "@midpoker/ui/button";
import { Icons } from "@midpoker/ui/icons";
import { Spinner } from "@midpoker/ui/spinner";
import { useToast } from "@midpoker/ui/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { AvailableLeague, MetaGroupData } from "./rateio-utils";
import { formatPercent } from "./rateio-utils";
import { MetaGroupForm } from "./meta-group-form";
import { MetaGroupMembers } from "./meta-group-members";
import { TimeSlotsSection } from "./time-slots-section";

interface MetaGroupsSectionProps {
  availableLeagues: AvailableLeague[];
  fallbackGroups?: MetaGroupData[];
}

export function MetaGroupsSection({
  availableLeagues,
  fallbackGroups,
}: MetaGroupsSectionProps) {
  const trpc = useTRPC();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState<string | null>(null);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  // Queries
  const { data: groups, isLoading } = useQuery(
    trpc.su.metas["metaGroups.list"].queryOptions({}),
  );

  const { data: expandedGroupData } = useQuery(
    trpc.su.metas["metaGroups.getById"].queryOptions(
      { id: expandedGroup! },
      { enabled: !!expandedGroup },
    ),
  );

  // Mutations
  const createGroupMutation = useMutation(
    trpc.su.metas["metaGroups.create"].mutationOptions({
      onSuccess: () => {
        toast({ title: "Grupo criado com sucesso" });
        queryClient.invalidateQueries({
          queryKey: trpc.su.metas["metaGroups.list"].queryKey(),
        });
        setShowCreateForm(false);
      },
      onError: (error) => {
        toast({
          title: "Erro ao criar grupo",
          description: error.message,
          variant: "destructive",
        });
      },
    }),
  );

  const updateGroupMutation = useMutation(
    trpc.su.metas["metaGroups.update"].mutationOptions({
      onSuccess: () => {
        toast({ title: "Grupo atualizado" });
        queryClient.invalidateQueries({
          queryKey: trpc.su.metas["metaGroups.list"].queryKey(),
        });
        if (expandedGroup) {
          queryClient.invalidateQueries({
            queryKey: trpc.su.metas["metaGroups.getById"].queryKey(),
          });
        }
        setEditingGroup(null);
      },
      onError: (error) => {
        toast({
          title: "Erro ao atualizar grupo",
          description: error.message,
          variant: "destructive",
        });
      },
    }),
  );

  const deleteGroupMutation = useMutation(
    trpc.su.metas["metaGroups.delete"].mutationOptions({
      onSuccess: () => {
        toast({ title: "Grupo removido" });
        queryClient.invalidateQueries({
          queryKey: trpc.su.metas["metaGroups.list"].queryKey(),
        });
        if (expandedGroup) setExpandedGroup(null);
      },
      onError: (error) => {
        toast({
          title: "Erro ao remover grupo",
          description: error.message,
          variant: "destructive",
        });
      },
    }),
  );

  const addMemberMutation = useMutation(
    trpc.su.metas["metaGroupMembers.add"].mutationOptions({
      onSuccess: () => {
        toast({ title: "Membro adicionado" });
        if (expandedGroup) {
          queryClient.invalidateQueries({
            queryKey: trpc.su.metas["metaGroups.getById"].queryKey(),
          });
        }
        queryClient.invalidateQueries({
          queryKey: trpc.su.metas["metaGroups.list"].queryKey(),
        });
      },
      onError: (error) => {
        toast({
          title: "Erro ao adicionar membro",
          description: error.message,
          variant: "destructive",
        });
      },
    }),
  );

  const removeMemberMutation = useMutation(
    trpc.su.metas["metaGroupMembers.remove"].mutationOptions({
      onSuccess: () => {
        toast({ title: "Membro removido" });
        if (expandedGroup) {
          queryClient.invalidateQueries({
            queryKey: trpc.su.metas["metaGroups.getById"].queryKey(),
          });
        }
        queryClient.invalidateQueries({
          queryKey: trpc.su.metas["metaGroups.list"].queryKey(),
        });
      },
      onError: (error) => {
        toast({
          title: "Erro ao remover membro",
          description: error.message,
          variant: "destructive",
        });
      },
    }),
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner className="w-5 h-5" />
      </div>
    );
  }

  const hasDbGroups = groups && groups.length > 0;
  const totalPercent = hasDbGroups
    ? (groups ?? [])
        .filter((g: any) => g.is_active)
        .reduce((sum: number, g: any) => sum + Number(g.meta_percent), 0)
    : (fallbackGroups ?? [])
        .filter((g) => g.isActive)
        .reduce((sum, g) => sum + g.metaPercent, 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Grupos Meta</span>
          <Badge
            variant="outline"
            className={`text-[10px] ${totalPercent > 100 ? "border-red-500/30 text-red-500" : "border-muted-foreground/30"}`}
          >
            Total: {formatPercent(totalPercent)}
          </Badge>
        </div>
        <Button
          size="sm"
          className="h-7 text-xs"
          onClick={() => setShowCreateForm(true)}
        >
          + Novo Grupo
        </Button>
      </div>

      {/* Fallback Group Cards (read-only) */}
      {!hasDbGroups && fallbackGroups && fallbackGroups.length > 0 && (
        <>
          {fallbackGroups.map((group) => (
            <div
              key={group.id}
              className="border border-dashed rounded-lg"
            >
              <div className="flex items-center justify-between p-3">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{group.name}</span>
                  <Badge variant="outline" className="text-[10px]">
                    {formatPercent(group.metaPercent)}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="text-[9px] border-amber-500/30 text-amber-500"
                  >
                    Fallback
                  </Badge>
                </div>
              </div>
              {/* Members always visible */}
              <div className="border-t border-dashed px-3 pb-3 pt-2">
                <div className="flex flex-wrap gap-1.5">
                  {group.members.map((m) => (
                    <Badge
                      key={m.superUnionId}
                      variant="secondary"
                      className="text-[10px] font-normal"
                    >
                      {m.displayName ?? `SU ${m.superUnionId}`}
                      <span className="ml-1 text-muted-foreground">
                        ({m.superUnionId})
                      </span>
                    </Badge>
                  ))}
                  {group.members.length === 0 && (
                    <span className="text-xs text-muted-foreground">
                      Nenhum membro
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </>
      )}

      {/* Empty state (no DB groups, no fallback) */}
      {!hasDbGroups && (!fallbackGroups || fallbackGroups.length === 0) && (
        <div className="text-center py-6 text-sm text-muted-foreground border rounded-lg">
          Nenhum grupo configurado.
        </div>
      )}

      {(groups ?? []).map((group: any) => {
        const isExpanded = expandedGroup === group.id;
        return (
          <div
            key={group.id}
            className={`border rounded-lg ${group.is_active ? "" : "opacity-60"}`}
          >
            {/* Card header */}
            <div
              className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/30 transition-colors"
              onClick={() => setExpandedGroup(isExpanded ? null : group.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  setExpandedGroup(isExpanded ? null : group.id);
                }
              }}
            >
              <div className="flex items-center gap-2">
                <Icons.ChevronRight
                  className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                />
                <span className="font-medium text-sm">{group.name}</span>
                <Badge variant="outline" className="text-[10px]">
                  {formatPercent(Number(group.meta_percent))}
                </Badge>
                {!group.is_active && (
                  <Badge
                    variant="outline"
                    className="text-[9px] border-yellow-500/30 text-yellow-500"
                  >
                    Inativo
                  </Badge>
                )}
                <span className="text-[10px] text-muted-foreground">
                  {group.membersCount} membros
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingGroup(group.id);
                  }}
                >
                  <Icons.Edit className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 hover:text-red-500"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteGroupMutation.mutate({ id: group.id });
                  }}
                  disabled={deleteGroupMutation.isPending}
                >
                  <Icons.Trash className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            {/* Expanded content */}
            {isExpanded && expandedGroupData && (
              <div className="border-t px-3 pb-3 pt-2 space-y-3">
                {group.description && (
                  <p className="text-xs text-muted-foreground">
                    {group.description}
                  </p>
                )}

                {/* Members */}
                <MetaGroupMembers
                  members={expandedGroupData.members}
                  availableLeagues={availableLeagues}
                  onRemove={(memberId) =>
                    removeMemberMutation.mutate({ id: memberId })
                  }
                  onAdd={(data) =>
                    addMemberMutation.mutate({
                      metaGroupId: group.id,
                      ...data,
                    })
                  }
                  isRemoving={removeMemberMutation.isPending}
                  isAdding={addMemberMutation.isPending}
                />

                {/* Time Slots */}
                <TimeSlotsSection
                  metaGroupId={group.id}
                  timeSlots={expandedGroupData.timeSlots}
                />
              </div>
            )}
          </div>
        );
      })}

      {/* Create Dialog */}
      <MetaGroupForm
        open={showCreateForm}
        onOpenChange={setShowCreateForm}
        onSubmit={(data) => createGroupMutation.mutate(data)}
        isPending={createGroupMutation.isPending}
        mode="create"
        availableLeagues={availableLeagues}
      />

      {/* Edit Dialog */}
      {editingGroup &&
        (() => {
          const group = (groups ?? []).find((g: any) => g.id === editingGroup);
          if (!group) return null;
          return (
            <MetaGroupForm
              open={true}
              onOpenChange={(open) => {
                if (!open) setEditingGroup(null);
              }}
              onSubmit={(data) =>
                updateGroupMutation.mutate({
                  id: editingGroup,
                  ...data,
                })
              }
              isPending={updateGroupMutation.isPending}
              initialData={{
                name: group.name,
                metaPercent: Number(group.meta_percent),
                description: group.description,
              }}
              mode="edit"
            />
          );
        })()}
    </div>
  );
}
