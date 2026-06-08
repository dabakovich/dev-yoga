import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateTaskDto } from './dto/create-task.dto';
import {
  FindTasksQueryDto,
  SortOrder,
  TaskSortBy,
} from './dto/find-tasks-query.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { Task } from './task.entity';

@Injectable()
export class TasksService {
  // `@InjectRepository(Task)` asks Nest for the TypeORM repository bound to the
  // Task entity (registered via forFeature in TasksModule). The repository is
  // our typed gateway to the table — find/save/delete, etc.
  constructor(
    @InjectRepository(Task)
    private readonly tasksRepository: Repository<Task>,
  ) {}

  create(dto: CreateTaskDto): Promise<Task> {
    const task = this.tasksRepository.create(dto);
    return this.tasksRepository.save(task);
  }

  findAll(query: FindTasksQueryDto = {}): Promise<Task[]> {
    const sortBy = query.sortBy ?? TaskSortBy.CREATED_AT;
    const order: 'ASC' | 'DESC' =
      (query.sortOrder ?? SortOrder.DESC) === SortOrder.ASC ? 'ASC' : 'DESC';

    // QueryBuilder (rather than the simpler `find`) because sorting by priority
    // needs a computed rank — see below.
    const qb = this.tasksRepository.createQueryBuilder('task');
    // Omitting `status` keeps the original "return everything" behavior.
    if (query.status) {
      qb.where('task.status = :status', { status: query.status });
    }

    if (sortBy === TaskSortBy.PRIORITY) {
      // priority is stored as text ('low' | 'medium' | 'high'), so a plain
      // column sort would be alphabetical (high < low < medium). Map each value
      // to a numeric rank so ASC = low→high and DESC = high→low, then break ties
      // by recency for a stable order.
      qb.orderBy(
        `CASE task.priority WHEN 'high' THEN 3 WHEN 'medium' THEN 2 WHEN 'low' THEN 1 ELSE 0 END`,
        order,
      ).addOrderBy('task.createdAt', 'DESC');
    } else {
      qb.orderBy('task.createdAt', order);
    }

    return qb.getMany();
  }

  async findOne(id: string): Promise<Task> {
    const task = await this.tasksRepository.findOne({ where: { id } });
    if (!task) {
      throw new NotFoundException(`Task ${id} not found`);
    }
    return task;
  }

  async update(id: string, dto: UpdateTaskDto): Promise<Task> {
    // `preload` merges the changes onto the existing row (by id) and returns
    // undefined if no such row exists.
    const task = await this.tasksRepository.preload({ id, ...dto });
    if (!task) {
      throw new NotFoundException(`Task ${id} not found`);
    }
    return this.tasksRepository.save(task);
  }

  async remove(id: string): Promise<void> {
    const result = await this.tasksRepository.delete(id);
    if (!result.affected) {
      throw new NotFoundException(`Task ${id} not found`);
    }
  }
}
