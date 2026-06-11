import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createAnthropic } from '@ai-sdk/anthropic';
import { generateText, stepCountIs } from 'ai';
import { AgentToolsService } from './agent-tools.service';
import { ChatResult, createChatTurnEffects } from './chat-turn.types';
import { ChatMessageDto } from './dto/chat-request.dto';
import { AgentMemoryService } from './memory/agent-memory.service';
import { MockAgentService } from './mock-agent.service';
import { DEFAULT_MODEL, buildSystemPrompt } from './prompts/system-prompt';

// Orchestration only: pick mock vs live, run the agent loop, return the turn's
// effects. Tool definitions live in AgentToolsService, the prompt in
// prompts/system-prompt.ts, mock mode in MockAgentService.
@Injectable()
export class ChatAgentService {
  // ConfigService is injected by Nest's DI container (ConfigModule is global, so
  // we don't re-import it). It reads the resolved .env values at runtime.
  constructor(
    private readonly config: ConfigService,
    private readonly tools: AgentToolsService,
    private readonly memory: AgentMemoryService,
    private readonly mockAgent: MockAgentService,
  ) {}

  async chat(messages: ChatMessageDto[]): Promise<ChatResult> {
    const apiKey = this.config.get<string>('ANTHROPIC_API_KEY');

    // No key → mock mode, so `npm run start:dev` works for anyone cloning the
    // repo without Anthropic credentials. Documented in the README.
    if (!apiKey) {
      return this.mockAgent.chat(messages);
    }

    // Fresh per-request effects object; the tools close over it and record
    // everything they did this turn. (Stateless agent: nothing is persisted
    // about the conversation, only the tasks themselves land in the DB.)
    const effects = createChatTurnEffects();

    const anthropic = createAnthropic({ apiKey });
    const model = this.config.get<string>('AI_MODEL') ?? DEFAULT_MODEL;

    // Fold remembered project facts into the prompt so the otherwise-stateless
    // agent carries durable context (stack, conventions, people) across
    // conversations. Empty memory → buildSystemPrompt omits the facts section.
    const facts = await this.memory.findAll();
    const system = buildSystemPrompt(facts.map((f) => f.content));

    const { text } = await generateText({
      model: anthropic(model),
      system,
      // The client's transcript maps 1:1 onto AI SDK model messages.
      messages,
      tools: this.tools.build(effects),
      // The agent loop: let the model call tools and then summarize the
      // result. A small cap is a guardrail against runaway loops.
      stopWhen: stepCountIs(5),
    });

    return { reply: text, ...effects };
  }
}
