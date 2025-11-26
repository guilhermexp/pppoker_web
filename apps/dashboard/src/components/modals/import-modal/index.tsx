"use client";

import { importTransactionsAction } from "@/actions/transactions/import-transactions";
import { useSyncStatus } from "@/hooks/use-sync-status";
import { useTeamQuery } from "@/hooks/use-team";
import { useUpload } from "@/hooks/use-upload";
import { useUserQuery } from "@/hooks/use-user";
import { useZodForm } from "@/hooks/use-zod-form";
import { useI18n } from "@/locales/client";
import { useTRPC } from "@/trpc/client";
import { uniqueCurrencies } from "@midday/location/currencies";
import { AnimatedSizeContainer } from "@midday/ui/animated-size-container";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@midday/ui/dialog";
import { Icons } from "@midday/ui/icons";
import { SubmitButton } from "@midday/ui/submit-button";
import { useToast } from "@midday/ui/use-toast";
import { stripSpecialCharacters } from "@midday/utils";
import { useQueryClient } from "@tanstack/react-query";
import { useAction } from "next-safe-action/hooks";
import { parseAsBoolean, parseAsString, useQueryStates } from "nuqs";
import { useEffect, useState } from "react";
import { ImportCsvContext, importSchema } from "./context";
import { FieldMapping } from "./field-mapping";
import { SelectFile } from "./select-file";

const pages = ["select-file", "confirm-import"] as const;

export function ImportModal() {
  const t = useI18n();
  const { data: team } = useTeamQuery();
  const defaultCurrency = team?.baseCurrency || "USD";
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [runId, setRunId] = useState<string | undefined>();
  const [accessToken, setAccessToken] = useState<string | undefined>();
  const [isImporting, setIsImporting] = useState(false);
  const [fileColumns, setFileColumns] = useState<string[] | null>(null);
  const [firstRows, setFirstRows] = useState<Record<string, string>[] | null>(
    null,
  );

  const { data: user } = useUserQuery();

  const [pageNumber, setPageNumber] = useState<number>(0);
  const page = pages[pageNumber];

  const { uploadFile } = useUpload();

  const { toast } = useToast();

  const { status, setStatus } = useSyncStatus({ runId, accessToken });

  const [params, setParams] = useQueryStates({
    step: parseAsString,
    accountId: parseAsString,
    type: parseAsString,
    hide: parseAsBoolean.withDefault(false),
  });

  const isOpen = params.step === "import";

  const importTransactions = useAction(importTransactionsAction, {
    onSuccess: ({ data }) => {
      if (data) {
        setRunId(data.id);
        setAccessToken(data.publicAccessToken);
      } else {
        // If no data returned, something went wrong
        setIsImporting(false);
        toast({
          duration: 3500,
          variant: "error",
          title: t("import_modal.error"),
        });
      }
    },
    onError: () => {
      setIsImporting(false);
      setRunId(undefined);
      setAccessToken(undefined);
      setStatus("FAILED");

      toast({
        duration: 3500,
        variant: "error",
        title: t("import_modal.error"),
      });
    },
  });

  const {
    control,
    watch,
    setValue,
    handleSubmit,
    reset,
    formState: { isValid },
  } = useZodForm(importSchema, {
    defaultValues: {
      currency: defaultCurrency,
      bank_account_id: params.accountId ?? undefined,
      inverted: params.type === "credit",
    },
  });

  const file = watch("file");

  const onclose = () => {
    setIsImporting(false);
    setFileColumns(null);
    setFirstRows(null);
    setPageNumber(0);
    setRunId(undefined);
    setAccessToken(undefined);
    reset();

    setParams({
      step: null,
      accountId: null,
      type: null,
      hide: null,
    });
  };

  useEffect(() => {
    if (params.accountId) {
      setValue("bank_account_id", params.accountId);
    }
  }, [params.accountId]);

  useEffect(() => {
    if (params.type) {
      setValue("inverted", params.type === "credit");
    }
  }, [params.type]);

  useEffect(() => {
    if (status === "FAILED") {
      setIsImporting(false);
      setRunId(undefined);

      toast({
        duration: 3500,
        variant: "error",
        title: t("import_modal.error"),
      });
    }
  }, [status]);

  useEffect(() => {
    if (status === "COMPLETED") {
      setIsImporting(false);
      setRunId(undefined);
      setAccessToken(undefined);

      queryClient.invalidateQueries({
        queryKey: trpc.transactions.get.queryKey(),
      });

      queryClient.invalidateQueries({
        queryKey: trpc.bankAccounts.get.queryKey(),
      });

      queryClient.invalidateQueries({
        queryKey: trpc.bankConnections.get.queryKey(),
      });

      queryClient.invalidateQueries({
        queryKey: trpc.reports.pathKey(),
      });

      toast({
        duration: 3500,
        variant: "success",
        title: t("import_modal.success"),
      });

      onclose();
    }
  }, [status]);

  // Go to second page if file looks good
  useEffect(() => {
    if (file && fileColumns && firstRows && pageNumber === 0) {
      setPageNumber(1);
    }
  }, [file, fileColumns, firstRows, pageNumber]);

  return (
    <Dialog open={isOpen} onOpenChange={onclose}>
      <DialogContent>
        <div className="p-4 pb-0">
          <DialogHeader>
            <div className="flex space-x-4 items-center mb-4">
              {!params.hide && (
                <button
                  type="button"
                  className="items-center border bg-accent p-1"
                  onClick={() => setParams({ step: "connect" })}
                >
                  <Icons.ArrowBack />
                </button>
              )}
              <DialogTitle className="m-0 p-0">
                {page === "select-file" && t("import_modal.select_file")}
                {page === "confirm-import" && t("import_modal.confirm_import")}
              </DialogTitle>
            </div>
            <DialogDescription>
              {page === "select-file" && t("import_modal.upload_description")}
              {page === "confirm-import" && t("import_modal.mapping_description")}
            </DialogDescription>
          </DialogHeader>

          <div className="relative">
            <AnimatedSizeContainer height>
              <ImportCsvContext.Provider
                value={{
                  fileColumns,
                  setFileColumns,
                  firstRows,
                  setFirstRows,
                  control,
                  watch,
                  setValue,
                }}
              >
                <div>
                  <form
                    className="flex flex-col gap-y-4"
                    onSubmit={handleSubmit(async (data) => {
                      setIsImporting(true);

                      const filename = stripSpecialCharacters(data.file.name);
                      const { path } = await uploadFile({
                        bucket: "vault",
                        path: [user?.team?.id ?? "", "imports", filename],
                        file,
                      });

                      importTransactions.execute({
                        filePath: path,
                        currency: data.currency,
                        bankAccountId: data.bank_account_id,
                        currentBalance: data.balance,
                        inverted: data.inverted,
                        mappings: {
                          amount: data.amount,
                          date: data.date,
                          description: data.description,
                        },
                      });
                    })}
                  >
                    {page === "select-file" && <SelectFile />}
                    {page === "confirm-import" && (
                      <>
                        <FieldMapping currencies={uniqueCurrencies} />

                        <SubmitButton
                          isSubmitting={isImporting}
                          disabled={!isValid}
                          className="mt-4"
                        >
                          {t("import_modal.confirm_button")}
                        </SubmitButton>

                        <button
                          type="button"
                          className="text-sm mb-4 text-[#878787]"
                          onClick={() => {
                            setPageNumber(0);
                            reset();
                            setFileColumns(null);
                            setFirstRows(null);
                          }}
                        >
                          {t("import_modal.choose_another")}
                        </button>
                      </>
                    )}
                  </form>
                </div>
              </ImportCsvContext.Provider>
            </AnimatedSizeContainer>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
