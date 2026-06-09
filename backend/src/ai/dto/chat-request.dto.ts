import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsString,
  ValidateNested,
} from 'class-validator';

// The two conversation roles the client may send. The backend is stateless —
// the client re-sends the full transcript on every request — so these are the
// only roles we accept (no `system`; that's owned by the agent server-side).
export enum ChatRole {
  USER = 'user',
  ASSISTANT = 'assistant',
}

// One message in the conversation. `@ValidateNested` + `@Type` are what make the
// global ValidationPipe recurse into array items: without `@Type` class-validator
// can't know which class to instantiate for each element, so nested rules (and
// whitelisting) wouldn't run.
export class ChatMessageDto {
  @IsEnum(ChatRole)
  role!: ChatRole;

  @IsString()
  @IsNotEmpty()
  content!: string;
}

// Body for `POST /ai/chat`. Validated by the existing global ValidationPipe
// (whitelist strips unknown keys; transform turns the JSON into typed instances).
export class ChatRequestDto {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  messages!: ChatMessageDto[];
}
