import { describe, expect, it } from "bun:test";
import type { UIChatMessage } from "@api/ai/types";
import {
  extractUserTextFromMessage,
  normalizeNanobotJSONResponse,
} from "./nanobot";

describe("nanobot normalization helpers", () => {
  it("extracts text from message content", () => {
    const message = {
      id: "1",
      role: "user",
      content: "hello nanobot",
      parts: [{ type: "text", text: "ignored" }],
    } as unknown as UIChatMessage;

    expect(extractUserTextFromMessage(message)).toBe("hello nanobot");
  });

  it("extracts text from text parts when content is absent", () => {
    const message = {
      id: "2",
      role: "user",
      parts: [
        { type: "text", text: "hello " },
        { type: "text", text: "world" },
      ],
    } as unknown as UIChatMessage;

    expect(extractUserTextFromMessage(message)).toBe("hello world");
  });

  it("normalizes common nanobot JSON payload shapes", () => {
    const normalized = normalizeNanobotJSONResponse({
      answer: "OK",
      suggestions: ["a", "b"],
      sources: [{ url: "https://example.com", title: "Example" }],
    });

    expect(normalized).toEqual({
      text: "OK",
      suggestions: ["a", "b"],
      sources: [{ url: "https://example.com", title: "Example" }],
    });
  });
});
