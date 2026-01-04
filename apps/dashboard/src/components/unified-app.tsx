import { useTRPC } from "@/trpc/client";
import { getScopeDescription } from "@/utils/scopes";
import type { UnifiedApp } from "@midday/app-store/types";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@midday/ui/accordion";
import { Badge } from "@midday/ui/badge";
import { Button } from "@midday/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@midday/ui/card";
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
} from "@midday/ui/carousel";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@midday/ui/dropdown-menu";
import { ScrollArea } from "@midday/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader } from "@midday/ui/sheet";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";
import Image from "next/image";
import { parseAsBoolean, parseAsString, useQueryStates } from "nuqs";
import { Suspense, useEffect, useState } from "react";
import { AppSettings } from "./app-settings";
import { PokerImportSheet } from "./poker-import-sheet";
import { ImportsList } from "./poker/imports-list";

interface UnifiedAppProps {
  app: UnifiedApp;
  userEmail?: string;
}

function CarouselWithDots({
  images,
  appName,
}: { images: string[]; appName: string }) {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!api) {
      return;
    }

    setCurrent(api.selectedScrollSnap());

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);

  return (
    <div className="relative">
      <Carousel className="w-full max-w-[465px]" setApi={setApi}>
        <CarouselContent>
          {images.map((image: string, index: number) => (
            <CarouselItem key={`${appName}-${image}-${index.toString()}`}>
              <Image
                src={image}
                alt={`${appName} screenshot ${index + 1}`}
                width={465}
                height={290}
                quality={100}
              />
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>

      {/* Pagination dots */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
        {images.map((image, index) => (
          <button
            key={`dot-${image}-${index.toString()}`}
            type="button"
            className={`w-2 h-2 rounded-full transition-all ${
              index === current
                ? "bg-white shadow-lg"
                : "bg-white/50 hover:bg-white/75"
            }`}
            onClick={() => api?.scrollTo(index)}
            aria-label={`Go to screenshot ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

type PokerImportType = "club" | "league" | "su";

export function UnifiedAppComponent({ app }: UnifiedAppProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [isLoading, setLoading] = useState(false);
  const [pokerImportType, setPokerImportType] =
    useState<PokerImportType | null>(null);
  const [params, setParams] = useQueryStates({
    app: parseAsString,
    settings: parseAsBoolean,
  });

  const disconnectOfficialAppMutation = useMutation(
    trpc.apps.disconnect.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.apps.get.queryKey(),
        });
      },
    }),
  );

  const revokeExternalAppMutation = useMutation(
    trpc.oauthApplications.revokeAccess.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.oauthApplications.authorized.queryKey(),
        });
      },
    }),
  );

  const handleDisconnect = () => {
    if (app.type === "official") {
      disconnectOfficialAppMutation.mutate({ appId: app.id });
    } else {
      revokeExternalAppMutation.mutate({ applicationId: app.id });
    }
  };

  const handleOnInitialize = async () => {
    setLoading(true);

    try {
      if (app.type === "official" && app.onInitialize) {
        await app.onInitialize();
      } else if (app.type === "external" && app.installUrl) {
        window.open(app.installUrl, "_blank");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card key={app.id} className="w-full flex flex-col">
      <Sheet open={params.app === app.id} onOpenChange={() => setParams(null)}>
        <div className="pt-6 px-6 h-16 flex items-center justify-between">
          {app.type === "official" &&
          app.logo &&
          typeof app.logo !== "string" ? (
            <app.logo />
          ) : (
            <img src={app.logo as string} alt={app.name} className="w-8 h-8" />
          )}

          <div className="flex items-center gap-2">
            {app.installed && (
              <div className="text-green-600 bg-green-100 text-[10px] dark:bg-green-900 dark:text-green-300 px-3 py-1 rounded-full font-mono">
                Installed
              </div>
            )}
          </div>
        </div>

        <CardHeader className="pb-0">
          <div className="flex items-center space-x-2 pb-4">
            <CardTitle className="text-md font-medium leading-none p-0 m-0">
              {app.name}
            </CardTitle>
            {!app.active && (
              <span className="text-[#878787] bg-[#F2F1EF] text-[10px] dark:bg-[#1D1D1D] px-3 py-1 rounded-full font-mono">
                Coming soon
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="text-xs text-[#878787] pb-4">
          <p>{app.short_description}</p>
        </CardContent>

        <div className="px-6 pb-6 flex gap-2 mt-auto">
          <Button
            variant="outline"
            className="w-full"
            disabled={!app.active}
            onClick={() => setParams({ app: app.id })}
          >
            Details
          </Button>

          {app.installed ? (
            <Button
              variant="outline"
              className="w-full"
              onClick={handleDisconnect}
              disabled={
                disconnectOfficialAppMutation.isPending ||
                revokeExternalAppMutation.isPending
              }
            >
              {disconnectOfficialAppMutation.isPending ||
              revokeExternalAppMutation.isPending
                ? "Disconnecting..."
                : "Disconnect"}
            </Button>
          ) : app.id === "pppoker" ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full">
                  Importar
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => setPokerImportType("su")}>
                  Super Union Data
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setPokerImportType("league")}>
                  Liga Data
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setPokerImportType("club")}>
                  Clube Data
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              variant="outline"
              className="w-full"
              onClick={handleOnInitialize}
              disabled={!app.active || isLoading}
            >
              {isLoading ? "Installing..." : "Install"}
            </Button>
          )}
        </div>

        {app.id === "pppoker" && (
          <PokerImportSheet
            open={pokerImportType !== null}
            onOpenChange={(open) => !open && setPokerImportType(null)}
            type={pokerImportType}
          />
        )}

        <SheetContent>
          <SheetHeader>
            {app.images.length > 0 && (
              <div className="mb-4">
                {app.images.length === 1 ? (
                  <Image
                    src={app.images[0] as string}
                    alt={app.name}
                    width={465}
                    height={290}
                    quality={100}
                    className="rounded-lg"
                  />
                ) : (
                  <CarouselWithDots images={app.images} appName={app.name} />
                )}
              </div>
            )}

            <div>
              <ScrollArea className="h-[calc(100vh-530px)] pt-2" hideScrollbar>
                <Accordion
                  type="multiple"
                  defaultValue={[
                    "description",
                    ...(app.id === "pppoker" ? ["imports"] : []),
                    ...(params.settings ? ["settings"] : []),
                  ]}
                  className="mt-4"
                >
                  <AccordionItem value="description" className="border-none">
                    <AccordionTrigger>How it works</AccordionTrigger>
                    <AccordionContent className="text-[#878787] text-sm">
                      {app.description || app.overview}
                    </AccordionContent>
                  </AccordionItem>

                  {app.id === "pppoker" && (
                    <AccordionItem value="imports" className="border-none">
                      <AccordionTrigger>Planilhas Importadas</AccordionTrigger>
                      <AccordionContent>
                        <Suspense fallback={<ImportsList.Skeleton />}>
                          <ImportsList />
                        </Suspense>
                      </AccordionContent>
                    </AccordionItem>
                  )}

                  {app.type === "official" &&
                    app.settings &&
                    app.settings.length > 0 && (
                      <AccordionItem value="settings" className="border-none">
                        <AccordionTrigger>Settings</AccordionTrigger>
                        <AccordionContent className="text-[#878787] text-sm">
                          <AppSettings
                            appId={app.id}
                            settings={app.settings.map((setting) => {
                              // Find the user setting for this setting ID
                              const userSetting = Array.isArray(
                                app.userSettings,
                              )
                                ? app.userSettings.find(
                                    (us: any) => us.id === setting.id,
                                  )
                                : null;

                              return {
                                ...setting,
                                type: setting.type as
                                  | "switch"
                                  | "text"
                                  | "select",
                                value: userSetting?.value ?? setting.value,
                              };
                            })}
                          />
                        </AccordionContent>
                      </AccordionItem>
                    )}

                  {app.type === "external" && (
                    <>
                      {app.website && (
                        <AccordionItem value="website" className="border-none">
                          <AccordionTrigger>Website</AccordionTrigger>
                          <AccordionContent>
                            <a
                              href={app.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm hover:underline text-[#878787]"
                            >
                              {app.website}
                            </a>
                          </AccordionContent>
                        </AccordionItem>
                      )}

                      {app.scopes && app.scopes.length > 0 && (
                        <AccordionItem
                          value="permissions"
                          className="border-none"
                        >
                          <AccordionTrigger>Permissions</AccordionTrigger>
                          <AccordionContent>
                            <div className="flex flex-wrap gap-2">
                              {app.scopes.map((scope) => (
                                <Badge key={scope} variant="tag">
                                  {getScopeDescription(scope).label}
                                </Badge>
                              ))}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      )}
                    </>
                  )}
                </Accordion>
              </ScrollArea>
            </div>
          </SheetHeader>
        </SheetContent>
      </Sheet>
    </Card>
  );
}
