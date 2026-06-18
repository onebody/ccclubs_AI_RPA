import { Test, TestingModule } from '@nestjs/testing'
import { AuthService } from './auth.service'
import { PrismaService } from '../prisma/prisma.service'

describe('AuthService', () => {
  let service: AuthService
  let prisma: PrismaService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
              create: jest.fn(),
            },
          },
        },
      ],
    }).compile()

    service = module.get<AuthService>(AuthService)
    prisma = module.get<PrismaService>(PrismaService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  it('should return user and token when login with valid credentials', async () => {
    const mockUser = {
      id: 'user-1',
      username: 'testuser',
      password: '$2b$10$EixZaYbB.rK4fl8x2q7Meu6Q6D6RfF5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5',
      role: 'operator',
      tenantId: 'tenant-1',
    }

    jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser)

    const result = await service.login({ username: 'testuser', password: 'testpassword' })

    expect(result).toHaveProperty('accessToken')
    expect(result).toHaveProperty('user')
    expect(result.user.username).toBe('testuser')
  })

  it('should throw error when login with invalid credentials', async () => {
    jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(null)

    await expect(service.login({ username: 'nonexistent', password: 'password' })).rejects.toThrow()
  })

  it('should validate token and return user', async () => {
    const mockUser = {
      id: 'user-1',
      username: 'testuser',
      role: 'operator',
      tenantId: 'tenant-1',
    }

    jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser)

    const result = await service.validateUser('user-1')

    expect(result).toBeDefined()
    expect(result.username).toBe('testuser')
  })
})