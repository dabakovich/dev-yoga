import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MemoryFact } from './memory-fact.entity';

// A thin TypeORM wrapper over the MemoryFact table — mirrors TasksService.
// Memory is an agent concern, so this lives in the AI module rather than next
// to the tasks domain. No retrieval/ranking: at personal-tracker scale we just
// read every fact and inject the lot into the prompt (see ChatAgentService).
@Injectable()
export class AgentMemoryService {
  constructor(
    @InjectRepository(MemoryFact)
    private readonly memoryRepository: Repository<MemoryFact>,
  ) {}

  // Oldest first so the prompt reads like a stable, append-only list.
  findAll(): Promise<MemoryFact[]> {
    return this.memoryRepository.find({ order: { createdAt: 'ASC' } });
  }

  create(content: string): Promise<MemoryFact> {
    const fact = this.memoryRepository.create({ content });
    return this.memoryRepository.save(fact);
  }

  remove(id: string): Promise<void> {
    return this.memoryRepository.delete(id).then(() => undefined);
  }
}
