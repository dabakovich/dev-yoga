import { IsEnum, IsOptional } from 'class-validator';
import { TaskStatus } from '../task.entity';

// Query params accepted by `GET /tasks`. The global ValidationPipe validates
// these the same way it does request bodies — an unknown key is stripped
// (whitelist) and an out-of-enum `status` is rejected with a 400.
export class FindTasksQueryDto {
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;
}
