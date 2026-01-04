import { SecondaryMenu } from "@/components/secondary-menu";
import { getI18n } from "@/locales/server";

export default async function Layout({
  children,
}: { children: React.ReactNode }) {
  const t = await getI18n();

  return (
    <div className="max-w-[800px]">
      <SecondaryMenu
        items={[
          { path: "/account", label: t("navigation.account.general") },
          {
            path: "/account/date-and-locale",
            label: t("navigation.account.date_locale"),
          },
          {
            path: "/account/security",
            label: t("navigation.account.security"),
          },
          { path: "/account/teams", label: t("navigation.account.teams") },
          { path: "/account/support", label: t("navigation.account.support") },
        ]}
      />

      <main className="mt-8">{children}</main>
    </div>
  );
}
