"use client";

import { useTRPC } from "@/trpc/client";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@midpoker/ui/accordion";
import { useSuspenseQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { BankAccount } from "./bank-account";
import { BankLogo } from "./bank-logo";
import { DeleteConnection } from "./delete-connection";

type BankConnection = NonNullable<
  RouterOutputs["bankConnections"]["get"]
>[number];

function ConnectionState({ connection }: { connection: BankConnection }) {
  if (connection.lastAccessed) {
    return (
      <div className="text-xs font-normal flex items-center space-x-1">
        <span className="text-xs font-normal">{`Updated ${formatDistanceToNow(
          new Date(connection.lastAccessed),
          {
            addSuffix: true,
          },
        )}`}</span>
      </div>
    );
  }

  return <div className="text-xs font-normal">Manual account</div>;
}

export function BankConnection({ connection }: { connection: BankConnection }) {
  return (
    <div>
      <div className="flex justify-between items-center">
        <AccordionTrigger
          className="justify-start text-start w-full"
          chevronBefore
        >
          <div className="flex space-x-4 items-center ml-4 w-full">
            <BankLogo src={connection.logoUrl} alt={connection.name} />

            <div className="flex flex-col">
              <span className="text-sm">{connection.name}</span>
              <ConnectionState connection={connection} />
            </div>
          </div>
        </AccordionTrigger>

        <div className="ml-auto flex space-x-2 items-center">
          <DeleteConnection connectionId={connection.id} />
        </div>
      </div>

      <AccordionContent className="bg-background">
        <div className="ml-[30px] divide-y">
          {connection.bankAccounts.map((account) => {
            return <BankAccount key={account.id} data={account} />;
          })}
        </div>
      </AccordionContent>
    </div>
  );
}

export function BankConnections() {
  const trpc = useTRPC();
  const { data } = useSuspenseQuery(trpc.bankConnections.get.queryOptions());
  const defaultValue = data?.length === 1 ? ["connection-0"] : undefined;

  return (
    <div className="px-6 divide-y">
      <Accordion type="multiple" className="w-full" defaultValue={defaultValue}>
        {data?.map((connection, index) => {
          return (
            <AccordionItem
              value={`connection-${index}`}
              key={connection.id}
              className="border-none"
            >
              <BankConnection connection={connection} />
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}
