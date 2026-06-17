import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Conversation } from './conversation.entity';
import { Message, MessageRole } from './message.entity';
import { ConversationsService } from './conversations.service';

// Unit test in isolation: both TypeORM repositories are replaced with mocks
// (provided via getRepositoryToken) so nothing touches a real DB.
describe('ConversationsService', () => {
  let service: ConversationsService;

  const conversationsRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
  const messagesRepo = {
    create: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationsService,
        { provide: getRepositoryToken(Conversation), useValue: conversationsRepo },
        { provide: getRepositoryToken(Message), useValue: messagesRepo },
      ],
    }).compile();

    service = module.get(ConversationsService);
    jest.clearAllMocks();
  });

  it('create() persists a new conversation and returns it', async () => {
    const convo = { id: 'c1', title: null } as Conversation;
    conversationsRepo.create.mockReturnValue(convo);
    conversationsRepo.save.mockResolvedValue(convo);

    await expect(service.create()).resolves.toBe(convo);
    expect(conversationsRepo.save).toHaveBeenCalledWith(convo);
  });

  it('appendMessage() saves the message and bumps the conversation timestamp', async () => {
    const msg = { id: 'm1' } as Message;
    messagesRepo.create.mockReturnValue(msg);
    messagesRepo.save.mockResolvedValue(msg);

    const result = await service.appendMessage('c1', {
      role: MessageRole.USER,
      content: 'hello',
    });

    expect(result).toBe(msg);
    expect(messagesRepo.create).toHaveBeenCalledWith({
      conversation: { id: 'c1' },
      role: MessageRole.USER,
      content: 'hello',
      effects: null,
    });
    // Touch the parent so updatedAt advances and the list re-sorts.
    expect(conversationsRepo.update).toHaveBeenCalledWith('c1', {
      updatedAt: expect.any(Date),
    });
  });

  it('findAll() lists conversations newest-first without messages', async () => {
    const convos = [{ id: 'c1' }] as Conversation[];
    conversationsRepo.find.mockResolvedValue(convos);

    await expect(service.findAll()).resolves.toBe(convos);
    expect(conversationsRepo.find).toHaveBeenCalledWith({
      order: { updatedAt: 'DESC' },
    });
  });

  it('getWithMessages() returns the conversation with ordered messages', async () => {
    const convo = { id: 'c1', messages: [] } as unknown as Conversation;
    conversationsRepo.findOne.mockResolvedValue(convo);

    await expect(service.getWithMessages('c1')).resolves.toBe(convo);
    expect(conversationsRepo.findOne).toHaveBeenCalledWith({
      where: { id: 'c1' },
      relations: { messages: true },
      order: { messages: { createdAt: 'ASC' } },
    });
  });

  it('getWithMessages() throws NotFoundException when missing', async () => {
    conversationsRepo.findOne.mockResolvedValue(null);
    await expect(service.getWithMessages('nope')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('remove() throws NotFoundException when no row was deleted', async () => {
    conversationsRepo.delete.mockResolvedValue({ affected: 0, raw: {} });
    await expect(service.remove('nope')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('setTitle() updates only the title column', async () => {
    conversationsRepo.update.mockResolvedValue({ affected: 1 });
    await service.setTitle('c1', 'Triage backend backlog');
    expect(conversationsRepo.update).toHaveBeenCalledWith('c1', {
      title: 'Triage backend backlog',
    });
  });
});
