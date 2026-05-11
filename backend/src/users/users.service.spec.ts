import { NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';

describe('UsersService', () => {
  const prisma = { user: { findUnique: jest.fn() } };
  let svc: UsersService;

  beforeEach(() => {
    jest.clearAllMocks();
    svc = new UsersService(prisma as unknown as PrismaService);
  });

  it('returns profile', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: '1',
      email: 'a@b.co',
      fullName: 'A',
      role: Role.USER,
      createdAt: new Date(),
    });
    await expect(svc.getProfile('1')).resolves.toMatchObject({ email: 'a@b.co' });
  });

  it('throws when missing', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(svc.getProfile('x')).rejects.toThrow(NotFoundException);
  });
});
