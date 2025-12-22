"use client";

import type { ValidationWarning } from "@/lib/poker/types";
import { Icons } from "@midday/ui/icons";

type WarningsTabProps = {
  warnings: ValidationWarning[];
};

export function WarningsTab({ warnings }: WarningsTabProps) {
  const errorCount = warnings.filter((w) => w.severity === "error").length;
  const warningCount = warnings.filter((w) => w.severity === "warning").length;
  const infoCount = warnings.filter((w) => w.severity === "info").length;

  if (warnings.length === 0) {
    return (
      <div className="text-center py-8">
        <Icons.Check className="w-8 h-8 mx-auto text-[#00C969] mb-2" />
        <p>Nenhum aviso</p>
        <p className="text-sm text-[#878787] mt-1">
          Os dados estão prontos para importação
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-center gap-4 text-sm">
        <span className="text-[#878787]">{warnings.length} alertas</span>
        {errorCount > 0 && <span className="text-[#FF3638]">{errorCount} erros</span>}
        {warningCount > 0 && <span>{warningCount} avisos</span>}
        {infoCount > 0 && <span className="text-[#878787]">{infoCount} info</span>}
      </div>

      {/* Warnings list */}
      <div className="space-y-3">
        {warnings.map((warning) => (
          <div key={warning.id} className="border rounded-lg p-4">
            <div className="flex items-start gap-3">
              <SeverityIcon severity={warning.severity} />
              <div className="flex-1">
                <p className="font-medium">{warning.title}</p>
                <p className="text-sm text-[#878787] mt-1">{warning.description}</p>
                {warning.suggestedAction && (
                  <p className="text-sm mt-2 flex items-center gap-1">
                    <Icons.ArrowForward className="w-3 h-3" />
                    {warning.suggestedAction}
                  </p>
                )}
                {warning.relatedEntities && warning.relatedEntities.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {warning.relatedEntities.map((entity, i) => (
                      <span
                        key={i}
                        className="text-xs px-2 py-0.5 border rounded"
                      >
                        {entity}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SeverityIcon({ severity }: { severity: ValidationWarning["severity"] }) {
  switch (severity) {
    case "error":
      return <Icons.Close className="w-4 h-4 text-[#FF3638] flex-shrink-0 mt-0.5" />;
    case "warning":
      return <Icons.AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />;
    case "info":
      return <Icons.Info className="w-4 h-4 text-[#878787] flex-shrink-0 mt-0.5" />;
  }
}
