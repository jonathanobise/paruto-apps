import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { env } from "@/server/platform/env";

/**
 * Model provider boundary. The assistant only talks to this interface, so tests run against
 * MockProvider and the app shows an honest "not connected" state when no API key is configured.
 */
export type ChatMessage = Anthropic.Beta.BetaMessageParam;
export type ChatTool = Anthropic.Beta.BetaTool;

export interface ChatRequest {
  system: string;
  messages: ChatMessage[];
  tools: ChatTool[];
  maxTokens: number;
}

export interface ChatResponse {
  /** Content blocks exactly as returned; they are appended back unchanged inside the tool loop. */
  content: Anthropic.Beta.BetaContentBlock[];
  stopReason: string | null;
  model: string;
  usage: { inputTokens: number; outputTokens: number };
}

export interface AIProvider {
  readonly name: string;
  complete(req: ChatRequest): Promise<ChatResponse>;
}

export const DEFAULT_MODEL = "claude-opus-5-5";

export class AnthropicProvider implements AIProvider {
  readonly name = "anthropic";
  private readonly client: Anthropic;
  constructor(
    private readonly model = process.env.AI_MODEL || DEFAULT_MODEL,
    /** Used only when the primary model is unavailable (overloaded / 5xx), not to route around refusals. */
    private readonly availabilityFallback = process.env.AI_FALLBACK_MODEL || "claude-sonnet-5-5",
  ) {
    this.client = new Anthropic({ maxRetries: 2, timeout: 60_000 });
  }

  async complete(req: ChatRequest): Promise<ChatResponse> {
    try {
      return await this.call(this.model, req);
    } catch (err) {
      const unavailable = err instanceof Anthropic.APIError && (err.status === 529 || (err.status ?? 0) >= 500);
      if (!unavailable || this.availabilityFallback === this.model) throw err;
      return this.call(this.availabilityFallback, req);
    }
  }

  private async call(model: string, req: ChatRequest): Promise<ChatResponse> {
    const res = await this.client.beta.messages.create({
      model,
      max_tokens: req.maxTokens,
      output_config: { effort: "medium" },
      // Server-side fallback: if the model declines for policy reasons, the API retries on the
      // model's default fallback configuration.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: req.system,
      tools: req.tools,
      messages: req.messages,
    });
    return { content: res.content, stopReason: res.stop_reason, model: res.model, usage: { inputTokens: res.usage.input_tokens, outputTokens: res.usage.output_tokens } };
  }
}

/**
 * Returns null when no Anthropic credentials are configured: the UI then says the assistant is not
 * connected. AI_PROVIDER=test selects the scripted TEST provider for browser tests; it is refused
 * when APP_ENV is production, and every answer it gives is labelled as a test.
 */
export function getProvider(): AIProvider | null {
  if (process.env.AI_PROVIDER === "test") {
    if (env().APP_ENV === "production") throw new Error("AI_PROVIDER=test is not allowed in production");
    return new TestProvider();
  }
  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) return null;
  return new AnthropicProvider();
}

/** Scripted provider for end-to-end tests: looks the question up in the catalogue, then answers with a labelled canned reply. */
class TestProvider implements AIProvider {
  readonly name = "test";
  async complete(req: ChatRequest): Promise<ChatResponse> {
    const last = req.messages.filter((m) => m.role === "user").at(-1);
    const usage = { inputTokens: 10, outputTokens: 10 };
    if (last && Array.isArray(last.content) && last.content.some((b) => b.type === "tool_result")) {
      return { content: [text("[TEST PROVIDER] This is a scripted test answer, not a real one. I looked up the catalogue for you.")], stopReason: "end_turn", model: "test-provider", usage };
    }
    const q = typeof last?.content === "string" ? last.content : "";
    return { content: [toolUse(`test_${Date.now()}`, "search_instruments", { query: q.split(/\s+/).at(-1)?.replace(/\W/g, "") ?? "" })], stopReason: "tool_use", model: "test-provider", usage };
  }
}

/**
 * Scripted provider for tests. Each turn is a function of the request so tests can assert what
 * the model was sent (tools offered, system notes, tool results).
 */
export class MockProvider implements AIProvider {
  readonly name = "mock";
  readonly requests: ChatRequest[] = [];
  constructor(private readonly turns: Array<(req: ChatRequest) => Partial<ChatResponse> & { content: ChatResponse["content"] }>) {}
  async complete(req: ChatRequest): Promise<ChatResponse> {
    this.requests.push(structuredClone(req));
    const turn = this.turns[this.requests.length - 1];
    if (!turn) throw new Error("MockProvider: no scripted turn left");
    const r = turn(req);
    return { stopReason: "end_turn", model: "mock-model", usage: { inputTokens: 100, outputTokens: 50 }, ...r };
  }
}

export const text = (t: string) => ({ type: "text", text: t, citations: null }) as Anthropic.Beta.BetaContentBlock;
export const toolUse = (id: string, name: string, input: Record<string, unknown>) => ({ type: "tool_use", id, name, input, caller: { type: "direct" } }) as unknown as Anthropic.Beta.BetaContentBlock;
