import { Module } from '@nestjs/common';
import { TasksModule } from '../tasks/tasks.module';
import { AiController } from './ai.controller';
import { ChatAgentService } from './chat-agent.service';

@Module({
  // Importing TasksModule pulls its exported TasksService into this module's DI
  // scope — the agent reuses the existing CRUD service instead of duplicating
  // it. ConfigService (used for the API key/model) is global, so no import here.
  imports: [TasksModule],
  controllers: [AiController],
  providers: [ChatAgentService],
})
export class AiModule {}
