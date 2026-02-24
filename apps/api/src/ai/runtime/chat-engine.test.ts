import { describe, expect, it } from "bun:test";
import type { UIChatMessage } from "@api/ai/types";
import {
  getChatEngineFromEnv,
  shouldFallbackToLegacyOnNanobotError,
} from "./chat-engine-config";
import {
  extractUserTextFromMessage,
  normalizeNanobotJSONResponse,
} from "./nanobot";

describe("chat engine env selection", () => {
  it("defaults to nanobot", () => {
    expect(getChatEngineFromEnv({})).toBe("nanobot");
  });

  it("supports nanobot engine flag", () => {
    expect(getChatEngineFromEnv({ CHAT_AGENT_ENGINE: "nanobot" })).toBe(
      "nanobot",
    );
  });

  it("falls back to nanobot for unknown values", () => {
    expect(getChatEngineFromEnv({ CHAT_AGENT_ENGINE: "foobar" })).toBe(
      "nanobot",
    );
  });

  it("disables fallback by default", () => {
    expect(shouldFallbackToLegacyOnNanobotError({})).toBe(false);
  });

  it("supports enabling fallback", () => {
    expect(
      shouldFallbackToLegacyOnNanobotError({
        NANOBOT_FALLBACK_TO_LEGACY: "true",
      }),
    ).toBe(true);
  });
});

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
