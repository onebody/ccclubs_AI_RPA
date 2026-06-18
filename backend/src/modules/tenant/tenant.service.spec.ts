import { Test, TestingModule } from '@nestjs/testing'
import { TenantService } from './tenant.service'
import { PrismaService } from '../prisma/prisma.service'

describe('TenantService', () => {
  let service: TenantService
  let prisma: PrismaService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantService,
        {
          provide: PrismaService,
          useValue: {
            tenant: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
          },
        },
      ],
    }).compile()

    service = module.get<TenantService>(TenantService)
    prisma = module.get<PrismaService>(PrismaService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  it('should create a tenant', async () => {
    const mockTenant = {
      id: 'tenant-1',
      name: 'Test Tenant',
      quota: 10,
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    jest.spyOn(prisma.tenant, 'create').mockResolvedValue(mockTenant)

    const result = await service.create({ name: 'Test Tenant', quota: 10 })

    expect(result.name).toBe('Test Tenant')
    expect(result.quota).toBe(10)
    expect(result.enabled).toBe(true)
  })

  it('should get all tenants', async () => {
    const mockTenants = [
      { id: 'tenant-1', name: 'Tenant A', quota: 10, enabled: true },
      { id: 'tenant-2', name: 'Tenant B', quota: 5, enabled: true },
    ]

    jest.spyOn(prisma.tenant, 'findMany').mockResolvedValue(mockTenants)

    const result = await service.findAll()

    expect(result.length).toBe(2)
    expect(result[0].name).toBe('Tenant A')
  })

  it('should get tenant by id', async () => {
    const mockTenant = { id: 'tenant-1', name: 'Test Tenant', quota: 10, enabled: true }

    jest.spyOn(prisma.tenant, 'findUnique').mockResolvedValue(mockTenant)

    const result = await service.findOne('tenant-1')

    expect(result).toBeDefined()
    expect(result.name).toBe('Test Tenant')
  })

  it('should update tenant', async () => {
    const mockTenant = { id: 'tenant-1', name: 'Updated Tenant', quota: 20, enabled: true }

    jest.spyOn(prisma.tenant, 'update').mockResolvedValue(mockTenant)

    const result = await service.update('tenant-1', { name: 'Updated Tenant', quota: 20 })

    expect(result.name).toBe('Updated Tenant')
    expect(result.quota).toBe(20)
  })

  it('should delete tenant', async () => {
    const mockTenant = { id: 'tenant-1', name: 'Test Tenant', quota: 10, enabled: true }

    jest.spyOn(prisma.tenant, 'delete').mockResolvedValue(mockTenant)

    const result = await service.remove('tenant-1')

    expect(result).toBeDefined()
  })
})