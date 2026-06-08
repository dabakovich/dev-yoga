import { IsEnum, IsOptional } from 'class-validator';
import { TaskStatus } from '../task.entity';

// Fields a caller may sort by. `createdAt` is the task's creation date.
export enum TaskSortBy {
  CREATED_AT = 'createdAt',
  PRIORITY = 'priority',
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

// Query params accepted by `GET /tasks`. The global ValidationPipe validates
// these the same way it does request bodies — an unknown key is stripped
// (whitelist) and an out-of-enum value is rejected with a 400. The defaults
// below are applied by class-transformer when the param is omitted, preserving
// the original "newest first" behavior.
export class FindTasksQueryDto {
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @IsEnum(TaskSortBy)
  sortBy?: TaskSortBy = TaskSortBy.CREATED_AT;

  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder = SortOrder.DESC;
}
