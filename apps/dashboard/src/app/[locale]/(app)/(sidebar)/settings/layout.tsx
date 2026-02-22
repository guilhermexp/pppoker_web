import { Header } from "@/components/header";
import { SecondaryMenu } from "@/components/secondary-menu";
import { SettingsPrimaryUserPanel } from "@/components/settings-primary-user-panel";
import { getI18n } from "@/locales/server";

export default async function Layout({
  children,
}: { children: React.ReactNode }) {
  const t = await getI18n();

  return (
    <div className="w-full max-w-[1160px]">
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
          {
            path: "/settings/nanobot",
            label: "Nanobot",
          },
        ]}
      />

      <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,800px)_320px] xl:gap-8">
        <main className="min-w-0 max-w-[800px]">{children}</main>

        <aside className="hidden xl:block">
          <div className="sticky top-24">
            <SettingsPrimaryUserPanel />
          </div>
        </aside>
      </div>
    </div>
  );
}
