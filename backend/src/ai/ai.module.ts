import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TasksModule } from '../tasks/tasks.module';
import { AiController } from './ai.controller';
import { AgentToolsService } from './agent-tools.service';
import { ChatAgentService } from './chat-agent.service';
import { AgentMemoryService } from './memory/agent-memory.service';
import { MemoryFact } from './memory/memory-fact.entity';
import { MockAgentService } from './mock-agent.service';

@Module({
  // Importing TasksModule pulls its exported TasksService into this module's DI
  // scope — the agent reuses the existing CRUD service instead of duplicating
  // it. ConfigService (used for the API key/model) is global, so no import here.
  // forFeature registers the MemoryFact repository here (with autoLoadEntities,
  // it also creates the table) — memory is an agent concern, so it lives in
  // this module, not TasksModule.
  imports: [TasksModule, TypeOrmModule.forFeature([MemoryFact])],
  controllers: [AiController],
  providers: [
    ChatAgentService,
    AgentToolsService,
    AgentMemoryService,
    MockAgentService,
  ],
})
export class AiModule {}
