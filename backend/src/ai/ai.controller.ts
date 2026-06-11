import { Body, Controller, Post } from '@nestjs/common';
import { ChatAgentService } from './chat-agent.service';
import { ChatResult } from './chat-turn.types';
import { ChatRequestDto } from './dto/chat-request.dto';

// `@Controller('ai')` prefixes routes here with /ai. The single POST /ai/chat
// endpoint is the one agentic surface for the whole product (no separate
// "Today" screen) — see AI_PLAN.md.
@Controller('ai')
export class AiController {
  constructor(private readonly chatAgent: ChatAgentService) {}

  @Post('chat')
  chat(@Body() dto: ChatRequestDto): Promise<ChatResult> {
    // The body is already validated by the global ValidationPipe (the DTO's
    // class-validator decorators). We just hand the transcript to the agent.
    return this.chatAgent.chat(dto.messages);
  }
}
