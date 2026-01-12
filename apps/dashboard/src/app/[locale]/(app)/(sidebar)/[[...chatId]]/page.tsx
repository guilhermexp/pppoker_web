import { AIDevtoolsWrapper } from "@/components/ai-devtools-wrapper";
import { ChatInterface } from "@/components/chat/chat-interface";
import { ClientOnly } from "@/components/client-only";
import { Widgets } from "@/components/widgets";
import { HydrateClient, getQueryClient, trpc } from "@/trpc/server";
import { Provider as ChatProvider } from "@ai-sdk-tools/store";
import { createClient } from "@midpoker/supabase/server";
import { geolocation } from "@vercel/functions";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Overview | Midday",
};

type Props = {
  params: Promise<{ chatId?: string[] }>;
};

export default async function Overview(props: Props) {
  // Validate session before making any tRPC calls
  // This prevents SSR errors when tokens are expired
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  const { chatId } = await props.params;

  // Extract the first chatId if it exists
  const currentChatId = chatId?.at(0);

  const headersList = await headers();
  const geo = geolocation({
    headers: headersList,
  });

  const queryClient = getQueryClient();

  // Fetch widget preferences directly for initial data (no prefetch needed)
  // Wrapped in try-catch to handle potential auth errors gracefully
  let widgetPreferences;
  try {
    widgetPreferences = await queryClient.fetchQuery(
      trpc.widgets.getWidgetPreferences.queryOptions(),
    );
  } catch (error) {
    // If auth error, redirect to login
    redirect("/login");
  }

  // SuggestedActions will fetch on client via Suspense - no SSR prefetch needed
  // This avoids auth timing issues during SSR

  let chat = null;
  if (currentChatId) {
    try {
      chat = await queryClient.fetchQuery(
        trpc.chats.get.queryOptions({ chatId: currentChatId }),
      );
    } catch (error) {
      // If chat not found or auth error, redirect to home
      redirect("/");
    }
  }

  if (currentChatId && !chat) {
    redirect("/");
  }

  return (
    <HydrateClient>
      <ClientOnly>
        <ChatProvider
          initialMessages={chat ?? []}
          key={currentChatId || "home"}
        >
          <Widgets initialPreferences={widgetPreferences} />
          <ChatInterface geo={geo} />
          <AIDevtoolsWrapper
            config={{
              streamCapture: {
                enabled: true,
                endpoint: `${process.env.NEXT_PUBLIC_API_URL}/chat`,
                autoConnect: true,
              },
            }}
          />
        </ChatProvider>
      </ClientOnly>
    </HydrateClient>
  );
}
