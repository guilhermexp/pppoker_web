import { Header } from "@/components/header";
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
          { path: "/settings", label: t("navigation.settings.general") },
          {
            path: "/settings/accounts",
            label: t("navigation.settings.bank_connections"),
          },
          {
            path: "/settings/members",
            label: t("navigation.settings.members"),
          },
          {
            path: "/settings/notifications",
            label: t("navigation.settings.notifications"),
          },
          {
            path: "/settings/developer",
            label: t("navigation.settings.developer"),
          },
        ]}
      />

      <main className="mt-8">{children}</main>
    </div>
  );
}
