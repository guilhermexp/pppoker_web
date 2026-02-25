import { BaseCurrency } from "@/components/base-currency/base-currency";
import { CompanyCountry } from "@/components/company-country";
import { CompanyEmail } from "@/components/company-email";
import { CompanyFiscalYear } from "@/components/company-fiscal-year";
import { CompanyLogo } from "@/components/company-logo";
import { CompanyName } from "@/components/company-name";
import { DeleteTeam } from "@/components/delete-team";
import { InfinitePaySettings } from "@/components/infinitepay-settings";
import { PokerSettings } from "@/components/poker-settings";
import { prefetch, trpc } from "@/trpc/server";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Team Settings | Midday",
};

export default async function Account() {
  prefetch(trpc.team.current.queryOptions());
  prefetch(trpc.team.getPokerSettings.queryOptions());
  prefetch(trpc.team.getInfinitePaySettings.queryOptions());

  return (
    <div className="space-y-12">
      <CompanyLogo />
      <CompanyName />
      <CompanyEmail />
      <CompanyCountry />
      <BaseCurrency />
      <CompanyFiscalYear />
      <PokerSettings />
      <InfinitePaySettings />
      <DeleteTeam />
    </div>
  );
}
