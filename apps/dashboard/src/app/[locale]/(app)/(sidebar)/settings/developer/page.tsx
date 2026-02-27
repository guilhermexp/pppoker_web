import { CreateApiKeyModal } from "@/components/modals/create-api-key-modal";
import { DeleteApiKeyModal } from "@/components/modals/delete-api-key-modal";
import { EditApiKeyModal } from "@/components/modals/edit-api-key-modal";
import { OAuthSecretModal } from "@/components/modals/oauth-secret-modal";
import { OAuthApplicationCreateSheet } from "@/components/sheets/oauth-application-create-sheet";
import { OAuthApplicationEditSheet } from "@/components/sheets/oauth-application-edit-sheet";
import { FeedbackSettings } from "@/components/feedback-settings";
import { DataTable } from "@/components/tables/api-keys";
import { OAuthDataTable } from "@/components/tables/oauth-applications";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Developer | Midday",
};

export default async function Page() {
  return (
    <>
      <div className="space-y-12">
        <DataTable />
        <OAuthDataTable />
        <FeedbackSettings />
      </div>

      <EditApiKeyModal />
      <DeleteApiKeyModal />
      <CreateApiKeyModal />
      <OAuthSecretModal />
      <OAuthApplicationCreateSheet />
      <OAuthApplicationEditSheet />
    </>
  );
}
