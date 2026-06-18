import { Test, TestingModule } from '@nestjs/testing'
import { TaskService } from './task.service'
import { PrismaService } from '../prisma/prisma.service'
import { SessionService } from '../session/session.service'
import { AuditService } from '../audit/audit.service'

describe('TaskService', () => {
  let service: TaskService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskService,
        {
          provide: PrismaService,
          useValue: {
            taskRecord: {
              create: jest.fn(),
              findMany: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
            },
          },
        },
        {
          provide: SessionService,
          useValue: {
            executeStep: jest.fn(),
          },
        },
        {
          provide: AuditService,
          useValue: {
            log: jest.fn(),
          },
        },
      ],
    }).compile()

    service = module.get<TaskService>(TaskService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  it('should create task', async () => {
    const mockTask = {
      id: 'task-1',
      type: 'NAVIGATE',
      status: 'COMPLETED',
      input: 'https://example.com',
      output: 'OK',
      duration: 1000,
      createdAt: new Date(),
    }

    jest.spyOn(service as any, 'prisma').mockReturnValue({
      taskRecord: {
        create: jest.fn().mockResolvedValue(mockTask),
      },
    })

    const result = await service.create({ type: 'NAVIGATE', input: 'https://example.com', sessionId: 'sess-1' })

    expect(result).toHaveProperty('id')
    expect(result.type).toBe('NAVIGATE')
  })

  it('should get tasks by session', async () => {
    const mockTasks = [
      { id: 'task-1', type: 'NAVIGATE', status: 'COMPLETED' },
      { id: 'task-2', type: 'CLICK', status: 'RUNNING' },
    ]

    const prisma = {
      taskRecord: {
        findMany: jest.fn().mockResolvedValue(mockTasks),
      },
    }

    const serviceWithPrisma = new TaskService(prisma as any, {} as any, {} as any)
    const result = await service.getTasksBySession('sess-1')

    expect(result.length).toBe(2)
  })
})