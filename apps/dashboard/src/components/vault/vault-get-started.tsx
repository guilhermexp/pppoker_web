"use client";

import { useI18n } from "@/locales/client";
import { Button } from "@midpoker/ui/button";

export function VaultGetStarted() {
  const t = useI18n();

  return (
    <div className="h-[calc(100vh-250px)] flex items-center justify-center">
      <div className="relative z-20 m-auto flex w-full max-w-[380px] flex-col">
        <div className="flex w-full flex-col relative text-center">
          <div className="pb-4">
            <h2 className="font-medium text-lg">{t("vault.empty_title")}</h2>
          </div>

          <p className="pb-6 text-sm text-[#878787]">
            {t("vault.empty_description")}
          </p>

          <Button
            variant="outline"
            onClick={() => document.getElementById("upload-files")?.click()}
          >
            {t("vault.upload")}
          </Button>
        </div>
      </div>
    </div>
  );
}
