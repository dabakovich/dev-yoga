import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

// Body for `POST /ai/chat`. The backend is now stateful: instead of the full
// transcript, the client sends just the new user message plus (after the first
// turn) the conversation it belongs to. Validated by the global ValidationPipe.
export class ChatRequestDto {
  // Absent on the first message of a new thread — the agent creates the
  // conversation and returns its id. Must be a uuid when present.
  @IsOptional()
  @IsUUID()
  conversationId?: string;

  @IsString()
  @IsNotEmpty()
  message!: string;
}
