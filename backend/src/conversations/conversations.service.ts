import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { ChatTurnEffects } from '../ai/chat-turn.types';
import { Conversation } from './conversation.entity';
import { Message, MessageRole } from './message.entity';

// Persistence gateway for conversations and their messages. The agent
// (ChatAgentService) and the REST controller both go through here — storage
// logic stays out of the agent.
@Injectable()
export class ConversationsService {
  constructor(
    @InjectRepository(Conversation)
    private readonly conversations: Repository<Conversation>,
    @InjectRepository(Message)
    private readonly messages: Repository<Message>,
  ) {}

  // A new, empty, untitled thread. The title is filled in later (first turn).
  create(): Promise<Conversation> {
    const conversation = this.conversations.create({ title: null });
    return this.conversations.save(conversation);
  }

  // Append one message. We set the FK with a bare `{ id }` reference (no need to
  // load the full parent row), then bump the parent's updatedAt so the list view
  // re-sorts to most-recent-first.
  async appendMessage(
    conversationId: string,
    data: {
      role: MessageRole;
      content: string;
      effects?: ChatTurnEffects | null;
    },
  ): Promise<Message> {
    const message = this.messages.create({
      conversation: { id: conversationId } as Conversation,
      role: data.role,
      content: data.content,
      effects: data.effects ?? null,
    });
    const saved = await this.messages.save(message);
    await this.conversations.update(conversationId, { updatedAt: new Date() });
    return saved;
  }

  // List for the index screen — newest first, no messages (keep it cheap).
  findAll(): Promise<Conversation[]> {
    return this.conversations.find({ order: { updatedAt: 'DESC' } });
  }

  // Full thread with its messages in chronological order.
  async getWithMessages(id: string): Promise<Conversation> {
    const conversation = await this.conversations.findOne({
      where: { id },
      relations: { messages: true },
      order: { messages: { createdAt: 'ASC' } },
    });
    if (!conversation) {
      throw new NotFoundException(`Conversation ${id} not found`);
    }
    return conversation;
  }

  async remove(id: string): Promise<void> {
    // onDelete: 'CASCADE' on Message.conversation drops the messages with it.
    const result = await this.conversations.delete(id);
    if (!result.affected) {
      throw new NotFoundException(`Conversation ${id} not found`);
    }
  }

  async setTitle(id: string, title: string): Promise<void> {
    await this.conversations.update(id, { title });
  }
}
