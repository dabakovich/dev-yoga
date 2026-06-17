import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createAnthropic } from '@ai-sdk/anthropic';
import { generateText, stepCountIs } from 'ai';
import { AgentToolsService } from './agent-tools.service';
import {
  AgentTurnOutput,
  ChatResult,
  createChatTurnEffects,
} from './chat-turn.types';
import { ChatRequestDto } from './dto/chat-request.dto';
import { AgentMemoryService } from './memory/agent-memory.service';
import { MockAgentService } from './mock-agent.service';
import { DEFAULT_MODEL, buildSystemPrompt } from './prompts/system-prompt';
import { ConversationsService } from '../conversations/conversations.service';
import { Conversation } from '../conversations/conversation.entity';
import { Message, MessageRole } from '../conversations/message.entity';

// A cheap model for the one-shot title call — titling doesn't need the full
// triage model. Falls back to the snippet if the call fails or there's no key.
const TITLE_MODEL = 'claude-haiku-4-5-20251001';

// The role/content pairs the AI SDK consumes. The persisted `effects` are NOT
// sent to the model — they exist only for UI rehydration.
type ModelMessage = { role: 'user' | 'assistant'; content: string };

// Orchestration: persist the turn around the (mock or live) text generation,
// and title the thread on its first turn.
@Injectable()
export class ChatAgentService {
  private readonly logger = new Logger(ChatAgentService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly tools: AgentToolsService,
    private readonly memory: AgentMemoryService,
    private readonly mockAgent: MockAgentService,
    private readonly conversations: ConversationsService,
  ) {}

  async chat(dto: ChatRequestDto): Promise<ChatResult> {
    // 1. Resolve the thread: existing one, or a fresh untitled conversation.
    const conversation: Conversation = dto.conversationId
      ? await this.conversations.getWithMessages(dto.conversationId)
      : await this.conversations.create();

    // 2. Persist the user's message.
    await this.conversations.appendMessage(conversation.id, {
      role: MessageRole.USER,
      content: dto.message,
    });

    // 3. Load the full history (now including the just-saved user message) and
    //    map it onto AI SDK messages. A freshly created conversation has no
    //    `messages` relation loaded, so re-fetch to get the canonical order.
    const full = await this.conversations.getWithMessages(conversation.id);
    const history: ModelMessage[] = full.messages.map((m: Message) => ({
      role: m.role === MessageRole.USER ? 'user' : 'assistant',
      content: m.content,
    }));

    // 4. Generate the assistant turn (mock vs live).
    const output = await this.generate(history);

    // 5. Persist the assistant message with its effects blob.
    await this.conversations.appendMessage(conversation.id, {
      role: MessageRole.ASSISTANT,
      content: output.reply,
      effects: {
        createdTasks: output.createdTasks,
        updatedTasks: output.updatedTasks,
        deletedTasks: output.deletedTasks,
        savedMemories: output.savedMemories,
        forgotMemories: output.forgotMemories,
      },
    });

    // 6. Title the thread on its first turn (title still null). Non-fatal.
    let title: string | undefined;
    if (!full.title) {
      title = await this.generateTitle(dto.message);
      await this.conversations.setTitle(conversation.id, title);
    }

    return { conversationId: conversation.id, title, ...output };
  }

  // Produce the reply + effects. No key → mock mode so the repo runs without
  // Anthropic credentials.
  private async generate(history: ModelMessage[]): Promise<AgentTurnOutput> {
    const apiKey = this.config.get<string>('ANTHROPIC_API_KEY');
    if (!apiKey) {
      return this.mockAgent.chat(history);
    }

    const effects = createChatTurnEffects();
    const anthropic = createAnthropic({ apiKey });
    const model = this.config.get<string>('AI_MODEL') ?? DEFAULT_MODEL;
    const facts = await this.memory.findAll();
    const system = buildSystemPrompt(facts.map((f) => f.content));

    const { text } = await generateText({
      model: anthropic(model),
      system,
      messages: history,
      tools: this.tools.build(effects),
      stopWhen: stepCountIs(5),
    });

    return { reply: text, ...effects };
  }

  // A short (<= 6 word) title from the opening message. In mock mode (no key) or
  // on any failure, fall back to a truncated snippet — titling must never break
  // the chat reply.
  private async generateTitle(firstMessage: string): Promise<string> {
    const snippet = firstMessage.trim().slice(0, 40);
    const apiKey = this.config.get<string>('ANTHROPIC_API_KEY');
    if (!apiKey) {
      return snippet;
    }
    try {
      const anthropic = createAnthropic({ apiKey });
      const { text } = await generateText({
        model: anthropic(TITLE_MODEL),
        system:
          'You write terse chat titles. Reply with a title of at most 6 words. No quotes, no punctuation at the end.',
        prompt: `First message of the conversation:\n${firstMessage}`,
      });
      const cleaned = text.trim().replace(/^["']|["']$/g, '');
      return cleaned.length > 0 ? cleaned.slice(0, 60) : snippet;
    } catch (err) {
      this.logger.warn(`Title generation failed, using snippet: ${String(err)}`);
      return snippet;
    }
  }
}
