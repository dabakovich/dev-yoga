import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Conversation } from './conversation.entity';
import { Message } from './message.entity';
import { ConversationsController } from './conversations.controller';
import { ConversationsService } from './conversations.service';

@Module({
  // forFeature registers both repositories in this module's DI scope and (via
  // autoLoadEntities) tells the root connection about the entities so the tables
  // are created.
  imports: [TypeOrmModule.forFeature([Conversation, Message])],
  controllers: [ConversationsController],
  providers: [ConversationsService],
  // Export the service so AiModule (which imports this module) can inject it.
  exports: [ConversationsService],
})
export class ConversationsModule {}
