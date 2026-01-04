"use client";

import {
  languages,
  useChangeLocale,
  useCurrentLocale,
  useI18n,
} from "@/locales/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@midday/ui/card";
import { ComboboxDropdown } from "@midday/ui/combobox-dropdown";

const languageNames: Record<string, string> = {
  en: "English",
  pt: "Portugues",
  sv: "Svenska",
};

export function LanguageSettings() {
  const t = useI18n();
  const currentLocale = useCurrentLocale();
  const changeLocale = useChangeLocale();

  const languageItems = languages.map((lang, index) => ({
    id: index.toString(),
    label: languageNames[lang] || lang,
    value: lang,
  }));

  return (
    <Card className="flex justify-between items-center">
      <CardHeader>
        <CardTitle>{t("language.title")}</CardTitle>
        <CardDescription>{t("language.description")}</CardDescription>
      </CardHeader>

      <CardContent>
        <div className="w-[250px]">
          <ComboboxDropdown
            placeholder={t("language.placeholder")}
            selectedItem={languageItems.find(
              (item) => item.value === currentLocale,
            )}
            items={languageItems}
            className="text-xs py-1"
            onSelect={(item) => {
              changeLocale(item.value as "en" | "pt");
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
}
