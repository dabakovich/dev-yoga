import { Body, Controller, Post } from '@nestjs/common';
import { ChatAgentService } from './chat-agent.service';
import { ChatResult } from './chat-turn.types';
import { ChatRequestDto } from './dto/chat-request.dto';

// `@Controller('ai')` prefixes routes here with /ai. The single POST /ai/chat
// endpoint is the one agentic surface for the whole product. It is now stateful:
// the body carries an optional conversationId + the new message, and the agent
// owns history persistence.
@Controller('ai')
export class AiController {
  constructor(private readonly chatAgent: ChatAgentService) {}

  @Post('chat')
  chat(@Body() dto: ChatRequestDto): Promise<ChatResult> {
    return this.chatAgent.chat(dto);
  }
}
