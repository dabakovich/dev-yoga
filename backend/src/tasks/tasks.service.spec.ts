import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CreateTaskDto } from './dto/create-task.dto';
import { SortOrder, TaskSortBy } from './dto/find-tasks-query.dto';
import { Task, TaskPriority, TaskStatus } from './task.entity';
import { TasksService } from './tasks.service';

// Unit tests for TasksService in isolation: the TypeORM repository is replaced
// with a mock (provided via `getRepositoryToken`) so nothing touches a real DB.
describe('TasksService', () => {
  let service: TasksService;

  // Chainable stub for `createQueryBuilder()` — each builder method returns the
  // stub so the service can keep chaining; only `getMany` resolves data.
  const qb = {
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
  };

  const repo = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    preload: jest.fn(),
    delete: jest.fn(),
    createQueryBuilder: jest.fn(() => qb),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: getRepositoryToken(Task), useValue: repo },
      ],
    }).compile();

    service = module.get(TasksService);
    jest.clearAllMocks();
  });

  it('create() persists the entity and returns it', async () => {
    const dto = {
      title: 'Write tests',
      priority: TaskPriority.HIGH,
    } as CreateTaskDto;
    const entity = { id: '1', ...dto } as Task;
    repo.create.mockReturnValue(entity);
    repo.save.mockResolvedValue(entity);

    await expect(service.create(dto)).resolves.toBe(entity);
    expect(repo.create).toHaveBeenCalledWith(dto);
    expect(repo.save).toHaveBeenCalledWith(entity);
  });

  it('findOne() returns the task when it exists', async () => {
    const task = { id: '1' } as Task;
    repo.findOne.mockResolvedValue(task);

    await expect(service.findOne('1')).resolves.toBe(task);
  });

  it('findOne() throws NotFoundException when missing', async () => {
    repo.findOne.mockResolvedValue(null);

    await expect(service.findOne('nope')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('remove() throws NotFoundException when no row was deleted', async () => {
    repo.delete.mockResolvedValue({ affected: 0, raw: {} });

    await expect(service.remove('nope')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('findAll() applies the status filter and defaults to newest-first', async () => {
    const tasks = [{ id: '1' }] as Task[];
    qb.getMany.mockResolvedValue(tasks);

    await expect(service.findAll({ status: TaskStatus.TODO })).resolves.toBe(
      tasks,
    );
    expect(qb.where).toHaveBeenCalledWith('task.status = :status', {
      status: TaskStatus.TODO,
    });
    expect(qb.orderBy).toHaveBeenCalledWith('task.createdAt', 'DESC');
  });

  it('findAll() ranks by priority (with a recency tie-break) when sortBy=priority', async () => {
    qb.getMany.mockResolvedValue([]);

    await service.findAll({
      sortBy: TaskSortBy.PRIORITY,
      sortOrder: SortOrder.ASC,
    });
    expect(qb.orderBy).toHaveBeenCalledWith(
      expect.stringContaining('CASE'),
      'ASC',
    );
    expect(qb.addOrderBy).toHaveBeenCalledWith('task.createdAt', 'DESC');
  });
});
