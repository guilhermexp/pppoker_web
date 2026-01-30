"use client";

import { useTRPC } from "@/trpc/client";
import { Badge } from "@midpoker/ui/badge";
import { Button } from "@midpoker/ui/button";
import { Icons } from "@midpoker/ui/icons";
import { useToast } from "@midpoker/ui/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { formatHourRange, formatPercent } from "./rateio-utils";
import { TimeSlotForm } from "./time-slot-form";

interface TimeSlot {
  id: string;
  name: string;
  hour_start: number;
  hour_end: number;
  metaPercent: number;
  is_active: boolean;
}

interface TimeSlotsSectionProps {
  metaGroupId: string;
  timeSlots: TimeSlot[];
}

export function TimeSlotsSection({
  metaGroupId,
  timeSlots,
}: TimeSlotsSectionProps) {
  const trpc = useTRPC();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingSlot, setEditingSlot] = useState<string | null>(null);

  const invalidateGroup = () => {
    queryClient.invalidateQueries({
      queryKey: trpc.su.metas["metaGroups.getById"].queryKey(),
    });
    queryClient.invalidateQueries({
      queryKey: trpc.su.metas["metaGroups.list"].queryKey(),
    });
  };

  const createSlotMutation = useMutation(
    trpc.su.metas["metaGroupTimeSlots.create"].mutationOptions({
      onSuccess: () => {
        toast({ title: "Time slot criado" });
        invalidateGroup();
        setShowCreateForm(false);
      },
      onError: (error) => {
        toast({
          title: "Erro ao criar time slot",
          description: error.message,
          variant: "destructive",
        });
      },
    }),
  );

  const updateSlotMutation = useMutation(
    trpc.su.metas["metaGroupTimeSlots.update"].mutationOptions({
      onSuccess: () => {
        toast({ title: "Time slot atualizado" });
        invalidateGroup();
        setEditingSlot(null);
      },
      onError: (error) => {
        toast({
          title: "Erro ao atualizar time slot",
          description: error.message,
          variant: "destructive",
        });
      },
    }),
  );

  const deleteSlotMutation = useMutation(
    trpc.su.metas["metaGroupTimeSlots.delete"].mutationOptions({
      onSuccess: () => {
        toast({ title: "Time slot removido" });
        invalidateGroup();
      },
      onError: (error) => {
        toast({
          title: "Erro ao remover time slot",
          description: error.message,
          variant: "destructive",
        });
      },
    }),
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
          Time Slots ({timeSlots.length})
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-[10px]"
          onClick={() => setShowCreateForm(true)}
        >
          + Adicionar
        </Button>
      </div>

      {timeSlots.length === 0 && (
        <p className="text-[10px] text-muted-foreground">
          Nenhum time slot configurado
        </p>
      )}

      {timeSlots.map((slot) => (
        <div
          key={slot.id}
          className={`flex items-center justify-between text-xs px-2 py-1.5 rounded border ${slot.is_active ? "" : "opacity-50"}`}
        >
          <div className="flex items-center gap-2">
            <span className="font-medium">{slot.name}</span>
            <Badge variant="outline" className="text-[9px]">
              {formatHourRange(slot.hour_start, slot.hour_end)}
            </Badge>
            <span className="text-muted-foreground">
              {formatPercent(slot.metaPercent)}
            </span>
          </div>
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0"
              onClick={() => setEditingSlot(slot.id)}
            >
              <Icons.Edit className="w-3 h-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0 hover:text-red-500"
              onClick={() => deleteSlotMutation.mutate({ id: slot.id })}
              disabled={deleteSlotMutation.isPending}
            >
              <Icons.Trash className="w-3 h-3" />
            </Button>
          </div>
        </div>
      ))}

      {/* Create Dialog */}
      <TimeSlotForm
        open={showCreateForm}
        onOpenChange={setShowCreateForm}
        onSubmit={(data) => createSlotMutation.mutate({ metaGroupId, ...data })}
        isPending={createSlotMutation.isPending}
        mode="create"
      />

      {/* Edit Dialog */}
      {editingSlot &&
        (() => {
          const slot = timeSlots.find((s) => s.id === editingSlot);
          if (!slot) return null;
          return (
            <TimeSlotForm
              open={true}
              onOpenChange={(open) => {
                if (!open) setEditingSlot(null);
              }}
              onSubmit={(data) =>
                updateSlotMutation.mutate({ id: editingSlot, ...data })
              }
              isPending={updateSlotMutation.isPending}
              initialData={{
                name: slot.name,
                hourStart: slot.hour_start,
                hourEnd: slot.hour_end,
                metaPercent: slot.metaPercent,
              }}
              mode="edit"
            />
          );
        })()}
    </div>
  );
}
