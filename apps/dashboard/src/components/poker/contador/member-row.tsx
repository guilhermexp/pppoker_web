"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@midpoker/ui/avatar";
import { Badge } from "@midpoker/ui/badge";
import { Checkbox } from "@midpoker/ui/checkbox";
import { cn } from "@midpoker/ui/cn";
import { memo } from "react";
import type { LiveMember } from "./types";
import { ROLE_COLORS, formatBalance } from "./types";

export interface MemberRowProps {
  member: LiveMember;
  isSelected: boolean;
  onToggle: () => void;
}

export const MemberRow = memo(function MemberRow({
  member,
  isSelected,
  onToggle,
}: MemberRowProps) {
  const initials = member.nome.slice(0, 2).toUpperCase();
  const roleColor = ROLE_COLORS[member.papel] ?? ROLE_COLORS.Membro;
  const cashbox = member.saldo_caixa ?? 0;

  return (
    <div
      className={cn(
        "flex items-center gap-2 border-b border-border py-2 last:border-b-0 transition-colors cursor-pointer",
        isSelected ? "bg-primary/10" : "hover:bg-muted/50",
      )}
      onClick={onToggle}
    >
      <div className="relative flex-shrink-0">
        <Avatar className="h-7 w-7">
          {member.avatar_url && <AvatarImage src={member.avatar_url} />}
          <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
        </Avatar>
        <div
          className={cn(
            "absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border-[1.5px] border-background",
            member.online ? "bg-green-500" : "bg-gray-400",
          )}
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-medium text-xs truncate">{member.nome}</span>
          <Badge
            variant={
              member.papel === "Dono" || member.papel === "Gestor"
                ? "default"
                : member.papel === "Agente" || member.papel === "Super Agente"
                  ? "outline"
                  : "secondary"
            }
            className="text-[10px] px-1.5 py-0"
          >
            {member.papel}
          </Badge>
        </div>
        <p className="text-[10px] text-muted-foreground font-mono leading-tight">{member.uid}</p>
        {member.agente_nome ? (
          <p className="truncate text-[10px] text-muted-foreground leading-tight">
            Agente: {member.agente_nome}
          </p>
        ) : member.titulo && member.titulo !== member.nome ? (
          <p className="truncate text-[10px] text-muted-foreground leading-tight">
            {member.titulo}
          </p>
        ) : null}
      </div>

      <div className="flex items-center gap-1.5 flex-shrink-0">
        <span
          className={cn(
            "font-mono text-xs",
            cashbox > 0
              ? "text-green-600"
              : cashbox < 0
                ? "text-red-600"
                : "text-muted-foreground",
          )}
        >
          {cashbox >= 0 ? "+" : ""}
          {formatBalance(cashbox)}
        </span>
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onToggle()}
          onClick={(e) => e.stopPropagation()}
          className="flex-shrink-0 h-3.5 w-3.5"
        />
      </div>
    </div>
  );
});
