"use client";

import { Button } from "@midpoker/ui/button";
import { Icons } from "@midpoker/ui/icons";
import { generateId } from "ai";
import { useRouter } from "next/navigation";

export function NewChat() {
  const router = useRouter();

  const handleNewChat = () => {
    router.push(`/${generateId()}`);
  };

  return (
    <Button variant="outline" size="icon" onClick={handleNewChat}>
      <Icons.Add size={16} />
    </Button>
  );
}
