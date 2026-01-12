"use client";

import { useInvoiceParams } from "@/hooks/use-invoice-params";
import { useUserQuery } from "@/hooks/use-user";
import { downloadFile } from "@/lib/download";
import { useI18n } from "@/locales/client";
import { useTRPC } from "@/trpc/client";
import { getUrl } from "@/utils/environment";
import { getWebsiteLogo } from "@/utils/logos";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@midpoker/ui/accordion";
import { Avatar, AvatarFallback, AvatarImageNext } from "@midpoker/ui/avatar";
import { Button } from "@midpoker/ui/button";
import { cn } from "@midpoker/ui/cn";
import { Icons } from "@midpoker/ui/icons";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { CopyInput } from "./copy-input";
import { FormatAmount } from "./format-amount";
import { InvoiceActions } from "./invoice-actions";
import { InvoiceDetailsSkeleton } from "./invoice-details-skeleton";
import { InvoiceNote } from "./invoice-note";
import { InvoiceStatus } from "./invoice-status";
import { InvoiceActivity } from "./invoice/activity";
import { OpenURL } from "./open-url";

export function InvoiceDetails() {
  const t = useI18n();
  const trpc = useTRPC();
  const { invoiceId } = useInvoiceParams();
  const { data: user } = useUserQuery();

  const isOpen = invoiceId !== null;

  const { data, isLoading } = useQuery({
    ...trpc.invoice.getById.queryOptions({ id: invoiceId! }),
    enabled: isOpen,
  });

  if (isLoading) {
    return <InvoiceDetailsSkeleton />;
  }

  if (!data) {
    return null;
  }

  const {
    id,
    customer,
    amount,
    currency,
    status,
    vat,
    tax,
    paidAt,
    dueDate,
    issueDate,
    invoiceNumber,
    template,
    token,
    internalNote,
    updatedAt,
    sentAt,
    sentTo,
    customerName,
    scheduledAt,
  } = data;

  return (
    <div className="h-full">
      <div className="flex justify-between items-center">
        <div className="flex space-x-2 mt-1 items-center">
          <Avatar className="size-5">
            {customer?.website && (
              <AvatarImageNext
                src={getWebsiteLogo(customer?.website)}
                alt={`${customer?.name} logo`}
                width={20}
                height={20}
                quality={100}
              />
            )}
            <AvatarFallback className="text-[9px] font-medium">
              {customer?.name?.at(0) || customerName?.at(0)}
            </AvatarFallback>
          </Avatar>

          <span className="text-sm line-clamp-1">{customer?.name}</span>
        </div>
        <InvoiceStatus status={status} />
      </div>

      <div className="flex justify-between items-center mt-6 mb-3 relative">
        <div className="flex flex-col w-full space-y-1">
          <span
            className={cn("text-4xl select-text", {
              "line-through": status === "canceled",
            })}
          >
            {currency && (
              <FormatAmount amount={amount ?? 0} currency={currency} />
            )}
          </span>

          <div className="h-3 space-x-2">
            {vat !== 0 && vat != null && currency && (
              <span className="text-[#606060] text-xs select-text">
                {template?.vatLabel}{" "}
                <FormatAmount amount={vat} currency={currency} />
              </span>
            )}

            {tax !== 0 && tax != null && currency && (
              <span className="text-[#606060] text-xs select-text">
                {template?.taxLabel}{" "}
                <FormatAmount amount={tax} currency={currency} />
              </span>
            )}
          </div>
        </div>
      </div>

      <InvoiceActions status={status} id={id} />

      <div className="h-full p-0 pb-[143px] overflow-y-auto scrollbar-hide">
        {status === "paid" && (
          <div className="mt-8 flex flex-col space-y-1">
            <span className="text-base font-medium">
              {t("invoice_details.paid_on", {
                date: paidAt ? format(new Date(paidAt), "MMM dd") : "",
              })}
            </span>
            <span className="text-xs">
              <span className="text-[#606060]">
                {t("invoice_details.marked_as_paid")}
              </span>
            </span>
          </div>
        )}

        {status === "canceled" && (
          <div className="mt-8 flex flex-col space-y-1">
            <span className="text-base font-medium">
              {t("invoice_details.canceled_on", {
                date: updatedAt ? format(new Date(updatedAt), "MMM dd") : "",
              })}
            </span>
            <span className="text-xs">
              <span className="text-[#606060]">
                {t("invoice_details.marked_as_canceled")}
              </span>
            </span>
          </div>
        )}

        <div className="mt-6 flex flex-col space-y-4 border-t border-border pt-6">
          <div className="flex justify-between items-center">
            <span className="text-sm text-[#606060]">
              {t("invoice_details.due_date")}
            </span>
            <span className="text-sm">
              <span>{dueDate && format(new Date(dueDate), "MMM dd")}</span>
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-[#606060]">
              {t("invoice_details.issue_date")}
            </span>
            <span className="text-sm">
              <span>{issueDate && format(new Date(issueDate), "MMM dd")}</span>
            </span>
          </div>

          {scheduledAt && status === "scheduled" && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-[#606060]">
                {t("invoice_details.scheduled_at")}
              </span>
              <span className="text-sm">
                <span>
                  {format(
                    new Date(scheduledAt),
                    `MMM d, ${user?.timeFormat === 24 ? "HH:mm" : "h:mm a"}`,
                  )}
                </span>
              </span>
            </div>
          )}

          {sentAt && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-[#606060]">
                {t("invoice_details.sent_at")}
              </span>
              <span className="text-sm">
                <span>{sentAt && format(new Date(sentAt), "MMM dd")}</span>
              </span>
            </div>
          )}

          {sentTo && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-[#606060]">
                {t("invoice_details.sent_to")}
              </span>
              <span className="text-sm">{sentTo}</span>
            </div>
          )}

          <div className="flex justify-between items-center">
            <span className="text-sm text-[#606060]">
              {t("invoice_details.invoice_no")}
            </span>
            <span className="text-sm">
              <span>{invoiceNumber}</span>
            </span>
          </div>
        </div>

        {customer && (
          <div className="mt-6 flex flex-col space-y-2 border-t border-border pt-6">
            <span className="text-sm text-[#606060]">
              {t("invoice_details.invoice_link")}
            </span>
            <div className="flex w-full gap-2">
              <div className="flex-1 min-w-0 relative">
                <CopyInput value={`${getUrl()}/i/${token}`} className="pr-14" />

                <div className="absolute right-10 top-[11px] border-r border-border pr-2">
                  <OpenURL href={`${getUrl()}/i/${token}`}>
                    <Icons.OpenInNew />
                  </OpenURL>
                </div>
              </div>

              {status !== "draft" && (
                <Button
                  variant="secondary"
                  className="size-[38px] hover:bg-secondary shrink-0"
                  onClick={() => {
                    downloadFile(
                      `/api/download/invoice?id=${id}`,
                      `${invoiceNumber}.pdf`,
                    );
                  }}
                >
                  <div>
                    <Icons.ArrowCoolDown className="size-4" />
                  </div>
                </Button>
              )}
            </div>
          </div>
        )}

        <Accordion
          type="multiple"
          className="mt-6"
          defaultValue={internalNote ? ["note", "activity"] : ["activity"]}
        >
          <AccordionItem value="activity">
            <AccordionTrigger>{t("invoice_details.activity")}</AccordionTrigger>
            <AccordionContent>
              <InvoiceActivity data={data} />
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="note">
            <AccordionTrigger>
              {t("invoice_details.internal_note")}
            </AccordionTrigger>
            <AccordionContent>
              <InvoiceNote id={id} defaultValue={internalNote} />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  );
}
