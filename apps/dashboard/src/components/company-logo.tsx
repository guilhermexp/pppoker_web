"use client";

import { useTeamMutation, useTeamQuery } from "@/hooks/use-team";
import { useUpload } from "@/hooks/use-upload";
import { useScopedI18n } from "@/locales/client";
import { Avatar, AvatarFallback, AvatarImage } from "@midpoker/ui/avatar";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@midpoker/ui/card";
import { Spinner } from "@midpoker/ui/spinner";
import { stripSpecialCharacters } from "@midpoker/utils";
import { useRef } from "react";

export function CompanyLogo() {
  const inputRef = useRef<HTMLInputElement>(null);
  const { isLoading, uploadFile } = useUpload();
  const { data } = useTeamQuery();
  const { mutate: updateTeam } = useTeamMutation();
  const t = useScopedI18n("settings.company_logo");

  const handleUpload = async (evt: React.ChangeEvent<HTMLInputElement>) => {
    const { files } = evt.target;
    const selectedFile = files as FileList;

    const filename = stripSpecialCharacters(selectedFile[0]?.name ?? "");

    const { url } = await uploadFile({
      bucket: "avatars",
      path: [data?.id ?? "", filename],
      file: selectedFile[0] as File,
    });

    if (url) {
      updateTeam({ logoUrl: url });
    }
  };

  return (
    <Card>
      <div className="flex justify-between items-center pr-6">
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{t("description")}</CardDescription>
        </CardHeader>

        <Avatar
          className="rounded-none w-16 h-16 flex items-center justify-center bg-accent cursor-pointer"
          onClick={() => inputRef?.current?.click()}
        >
          {isLoading ? (
            <Spinner className="h-4 w-4" />
          ) : (
            <>
              <AvatarImage
                src={data?.logoUrl ?? undefined}
                alt={data?.name ?? undefined}
                width={64}
                height={64}
              />
              <AvatarFallback>
                <span className="text-md">{data?.name?.charAt(0)}</span>
              </AvatarFallback>
            </>
          )}

          <input
            ref={inputRef}
            type="file"
            style={{ display: "none" }}
            multiple={false}
            onChange={handleUpload}
          />
        </Avatar>
      </div>
      <CardFooter>{t("avatar_optional")}</CardFooter>
    </Card>
  );
}
