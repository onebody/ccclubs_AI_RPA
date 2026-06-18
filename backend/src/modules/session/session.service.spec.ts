import { Test, TestingModule } from '@nestjs/testing'
import { SessionService } from './session.service'
import { PrismaService } from '../prisma/prisma.service'
import { TenantService } from '../tenant/tenant.service'

describe('SessionService', () => {
  let service: SessionService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionService,
        {
          provide: PrismaService,
          useValue: {
            browserSession: {
              create: jest.fn(),
              findMany: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
          },
        },
        {
          provide: TenantService,
          useValue: {
            checkQuota: jest.fn(),
          },
        },
      ],
    }).compile()

    service = module.get<SessionService>(SessionService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  it('should create session with valid parameters', async () => {
    const mockSession = {
      id: '1',
      sessionId: 'sess-abc123',
      tenantId: 'tenant-1',
      status: 'ACTIVE',
      startTime: new Date(),
      createdAt: new Date(),
    }

    jest.spyOn(service as any, '_createSession').mockResolvedValue({
      sessionId: 'sess-abc123',
      cdpPort: 9222,
      proxyUrl: 'http://localhost:8080',
    })

    const result = await service.createSession({ tenantId: 'tenant-1' })

    expect(result).toHaveProperty('sessionId')
    expect(result).toHaveProperty('cdpPort')
    expect(result).toHaveProperty('proxyUrl')
  })

  it('should get sessions by tenant', async () => {
    const mockSessions = [
      { id: '1', sessionId: 'sess-1', tenantId: 'tenant-1', status: 'ACTIVE' },
      { id: '2', sessionId: 'sess-2', tenantId: 'tenant-1', status: 'DESTROYED' },
    ]

    const prisma = {
      browserSession: {
        findMany: jest.fn().mockResolvedValue(mockSessions),
      },
    }

    const serviceWithPrisma = new SessionService(prisma as any, {} as any)
    const result = await serviceWithPrisma.getSessions('tenant-1')

    expect(result.length).toBe(2)
  })

  it('should close session', async () => {
    const prisma = {
      browserSession: {
        findUnique: jest.fn().mockResolvedValue({ id: '1', sessionId: 'sess-1', status: 'ACTIVE' }),
        update: jest.fn().mockResolvedValue({ id: '1', sessionId: 'sess-1', status: 'DESTROYED' }),
      },
    }

    const serviceWithPrisma = new SessionService(prisma as any, {} as any)
    jest.spyOn(serviceWithPrisma as any, '_destroySession').mockResolvedValue()

    await serviceWithPrisma.closeSession('sess-1', 'tenant-1')
  })
})