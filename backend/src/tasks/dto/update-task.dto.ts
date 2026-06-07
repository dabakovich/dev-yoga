import { PartialType } from '@nestjs/mapped-types';
import { CreateTaskDto } from './create-task.dto';

// PartialType makes every field of CreateTaskDto optional while reusing its
// validation rules — the standard NestJS pattern for PATCH payloads.
export class UpdateTaskDto extends PartialType(CreateTaskDto) {}
