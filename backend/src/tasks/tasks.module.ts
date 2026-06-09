import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Task } from './task.entity';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

@Module({
  // forFeature registers the Task repository in this module's DI scope and (via
  // autoLoadEntities) tells the root connection about the Task entity.
  imports: [TypeOrmModule.forFeature([Task])],
  controllers: [TasksController],
  providers: [TasksService],
  // Export TasksService so other modules (e.g. AiModule) that `imports:
  // [TasksModule]` can inject it. A provider is private to its module unless
  // it is listed here — this is how Nest enforces module encapsulation.
  exports: [TasksService],
})
export class TasksModule {}
