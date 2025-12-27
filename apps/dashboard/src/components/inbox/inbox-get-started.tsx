"use client";

import { ConnectGmail } from "@/components/inbox/connect-gmail";
import { useUserQuery } from "@/hooks/use-user";
import { useI18n } from "@/locales/client";
import { getInboxEmail } from "@midday/inbox";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@midday/ui/accordion";
import { useRouter } from "next/navigation";
import { CopyInput } from "../copy-input";
import { UploadZone } from "./inbox-upload-zone";

export function InboxGetStarted() {
  const t = useI18n();
  const { data: user } = useUserQuery();
  const router = useRouter();

  const handleUpload = () => {
    router.push("/inbox?connected=true", { scroll: false });
  };

  return (
    <UploadZone onUploadComplete={handleUpload}>
      <div className="h-[calc(100vh-150px)] flex items-center justify-center">
        <div className="relative z-20 m-auto flex w-full max-w-[380px] flex-col">
          <div className="flex w-full flex-col relative">
            <div className="pb-4 text-center">
              <h2 className="font-medium text-lg">
                {t("gmail.connect_title")}
              </h2>
              <p className="pb-6 text-sm text-[#878787]">
                {t("gmail.connect_description")}
              </p>
            </div>

            <div className="pointer-events-auto flex flex-col space-y-4">
              <ConnectGmail />

              {user?.team?.inboxId && (
                <Accordion
                  type="single"
                  collapsible
                  className="border-t-[1px] pt-2 mt-6"
                >
                  <AccordionItem value="item-1" className="border-0">
                    <AccordionTrigger className="justify-center space-x-2 flex text-sm">
                      <span>{t("gmail.more_options")}</span>
                    </AccordionTrigger>
                    <AccordionContent className="mt-4">
                      <div className="flex flex-col space-y-4">
                        <CopyInput value={getInboxEmail(user.team.inboxId)} />
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              )}
            </div>

            <div className="text-center mt-8">
              <p className="text-xs text-[#878787]">
                {t("gmail.drag_drop_hint")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </UploadZone>
  );
}
