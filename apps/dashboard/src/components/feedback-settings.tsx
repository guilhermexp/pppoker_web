"use client";

import { useFeedbackStore } from "@/store/feedback";
import { Label } from "@midpoker/ui/label";
import { Switch } from "@midpoker/ui/switch";

export function FeedbackSettings() {
  const enabled = useFeedbackStore((s) => s.enabled);
  const toggle = useFeedbackStore((s) => s.toggle);

  return (
    <div className="w-full">
      <div className="flex flex-col md:flex-row md:items-center pb-4 gap-4 md:gap-8">
        <div className="flex-1">
          <h3 className="text-lg font-medium leading-none tracking-tight mb-2">
            Modo Feedback
          </h3>
          <p className="text-sm text-[#606060]">
            Permite que clientes cliquem em elementos da pagina e deixem
            comentarios visuais. Quando ativado, um botao "Feedback" aparece no
            canto inferior direito da tela.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between border border-border rounded-md p-4">
        <div className="pr-4 space-y-1">
          <Label className="text-[#878787]">Ativar modo feedback</Label>
          <p className="text-xs text-[#878787]">
            Exibe ferramentas de anotacao visual para revisao de interface
          </p>
        </div>
        <Switch checked={enabled} onCheckedChange={toggle} />
      </div>
    </div>
  );
}
