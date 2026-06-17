import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { ChatAgentService } from './chat-agent.service';
import { AgentToolsService } from './agent-tools.service';
import { AgentMemoryService } from './memory/agent-memory.service';
import { MockAgentService } from './mock-agent.service';
import { ConversationsService } from '../conversations/conversations.service';
import { MessageRole } from '../conversations/message.entity';
import { createChatTurnEffects } from './chat-turn.types';

// No ANTHROPIC_API_KEY is configured (config.get returns undefined), so these
// tests drive the mock path — that lets us assert the persistence orchestration
// without hitting Anthropic.
describe('ChatAgentService (stateful flow, mock mode)', () => {
  let service: ChatAgentService;

  const config = { get: jest.fn().mockReturnValue(undefined) };
  const tools = { build: jest.fn() };
  const memory = { findAll: jest.fn().mockResolvedValue([]) };
  const mockAgent = {
    chat: jest.fn().mockResolvedValue({
      reply: '[mock] hi',
      ...createChatTurnEffects(),
    }),
  };
  const conversations = {
    create: jest.fn().mockResolvedValue({ id: 'c1', title: null }),
    appendMessage: jest.fn().mockResolvedValue({ id: 'm1' }),
    getWithMessages: jest.fn(),
    setTitle: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatAgentService,
        { provide: ConfigService, useValue: config },
        { provide: AgentToolsService, useValue: tools },
        { provide: AgentMemoryService, useValue: memory },
        { provide: MockAgentService, useValue: mockAgent },
        { provide: ConversationsService, useValue: conversations },
      ],
    }).compile();

    service = module.get(ChatAgentService);
    jest.clearAllMocks();
    config.get.mockReturnValue(undefined);
    mockAgent.chat.mockResolvedValue({
      reply: '[mock] hi',
      ...createChatTurnEffects(),
    });
  });

  it('creates a conversation when no conversationId is given', async () => {
    conversations.create.mockResolvedValue({ id: 'c1', title: null });
    conversations.getWithMessages.mockResolvedValue({
      id: 'c1',
      title: null,
      messages: [{ role: MessageRole.USER, content: 'hi' }],
    });

    const result = await service.chat({ message: 'hi' });

    expect(conversations.create).toHaveBeenCalledTimes(1);
    expect(result.conversationId).toBe('c1');
  });

  it('persists the user message then the assistant message with effects', async () => {
    conversations.create.mockResolvedValue({ id: 'c1', title: null });
    conversations.getWithMessages.mockResolvedValue({
      id: 'c1',
      title: null,
      messages: [{ role: MessageRole.USER, content: 'hi' }],
    });

    await service.chat({ message: 'hi' });

    // First append = the user's message.
    expect(conversations.appendMessage).toHaveBeenNthCalledWith(1, 'c1', {
      role: MessageRole.USER,
      content: 'hi',
    });
    // Second append = the assistant reply, carrying the effects blob.
    expect(conversations.appendMessage).toHaveBeenNthCalledWith(2, 'c1', {
      role: MessageRole.ASSISTANT,
      content: '[mock] hi',
      effects: expect.objectContaining({ createdTasks: [] }),
    });
  });

  it('sets a snippet title on the first turn in mock mode', async () => {
    conversations.create.mockResolvedValue({ id: 'c1', title: null });
    conversations.getWithMessages.mockResolvedValue({
      id: 'c1',
      title: null,
      messages: [
        { role: MessageRole.USER, content: 'Refactor the auth backend please' },
      ],
    });

    const result = await service.chat({ message: 'Refactor the auth backend please' });

    expect(conversations.setTitle).toHaveBeenCalledWith(
      'c1',
      'Refactor the auth backend please',
    );
    expect(result.title).toBe('Refactor the auth backend please');
  });

  it('does NOT retitle a conversation that already has a title', async () => {
    conversations.getWithMessages.mockResolvedValue({
      id: 'c1',
      title: 'Existing title',
      messages: [{ role: MessageRole.USER, content: 'next message' }],
    });

    const result = await service.chat({ conversationId: 'c1', message: 'next message' });

    expect(conversations.create).not.toHaveBeenCalled();
    expect(conversations.setTitle).not.toHaveBeenCalled();
    expect(result.title).toBeUndefined();
  });
});
