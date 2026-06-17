import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
} from '@nestjs/common';
import { ConversationsService } from './conversations.service';

// `@Controller('conversations')` prefixes these routes with /conversations.
// There is no POST here — conversations are created implicitly by POST /ai/chat
// (the agent owns thread creation). This controller is read + delete only.
@Controller('conversations')
export class ConversationsController {
  constructor(private readonly conversations: ConversationsService) {}

  @Get()
  findAll() {
    return this.conversations.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    // Throws NotFoundException (404) if the id is unknown.
    return this.conversations.getWithMessages(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.conversations.remove(id);
  }
}
