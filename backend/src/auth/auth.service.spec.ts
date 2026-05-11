import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AuthService', () => {
  let service: AuthService;
  const prisma = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };
  const jwtService = {
    signAsync: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuthService(prisma as unknown as PrismaService, jwtService as unknown as JwtService);
  });

  it('logs in successfully', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'a@b.co',
      passwordHash: '$2b$10$abcdefghijklmnopqrstuv',
      role: Role.USER,
    });
    jwtService.signAsync.mockResolvedValue('tok');
    const bcryptMod = jest.requireActual('bcrypt') as typeof import('bcrypt');
    jest.spyOn(bcryptMod, 'compare').mockResolvedValue(true as never);

    const res = await service.login({
      email: 'A@B.CO ',
      password: 'Password123',
    });

    expect(res.accessToken).toBe('tok');
    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { email: 'a@b.co' } });

    jest.restoreAllMocks();
  });

  it('throws when user missing', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(service.login({ email: 'x@y.z', password: 'Password123' })).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('throws when password mismatch', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'a@b.co',
      passwordHash: '$2b$10$h',
      role: Role.USER,
    });
    const bcryptMod = jest.requireActual('bcrypt') as typeof import('bcrypt');
    jest.spyOn(bcryptMod, 'compare').mockResolvedValue(false as never);
    await expect(service.login({ email: 'a@b.co', password: 'wrongpass1' })).rejects.toThrow(
      UnauthorizedException,
    );
    jest.restoreAllMocks();
  });

  it('registers fullName-null when omitting fullName field', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({
      id: 'nu',
      email: 'nameless@x.co',
      role: Role.USER,
    });
    jwtService.signAsync.mockResolvedValue('tok');
    await service.register({
      email: 'nameless@x.co',
      password: 'Password123',
    });
    expect(prisma.user.create.mock.calls[0][0].data.fullName).toBeNull();
  });

  it('registers new user with full name', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({
      id: 'nu',
      email: 'new@x.co',
      role: Role.USER,
    });
    jwtService.signAsync.mockResolvedValue('nt');
    const res = await service.register({ email: ' New@x.co ', password: 'Password123', fullName: 'N' });
    expect(res.role).toBe(Role.USER);
    expect(prisma.user.create.mock.calls[0][0].data.email).toBe('new@x.co');
    expect(prisma.user.create.mock.calls[0][0].data.role).toBe(Role.USER);
    expect(prisma.user.create.mock.calls[0][0].data.fullName).toBe('N');
  });

  it('conflict on duplicate email', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'x', email: 'a', role: Role.USER });
    await expect(service.register({ email: 'a@b.co', password: 'Password123' })).rejects.toThrow(
      ConflictException,
    );
  });
});
