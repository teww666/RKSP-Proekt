import { UnauthorizedException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtStrategy } from './jwt.strategy';
import { PrismaService } from '../prisma/prisma.service';

describe('JwtStrategy', () => {
  const prisma = {
    user: { findUnique: jest.fn() },
  };

  it('validates when user matches payload', async () => {
    const cfg = { get: jest.fn().mockReturnValue('explicit-secret') };
    const strategy = new JwtStrategy(cfg as never, prisma as unknown as PrismaService);
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'a@b.co',
      role: Role.USER,
    });
    await expect(
      strategy.validate({ sub: 'u1', email: 'a@b.co', role: Role.USER }),
    ).resolves.toMatchObject({ sub: 'u1' });
  });

  it('falls back to env secret placeholder when config omit', async () => {
    const cfg = { get: jest.fn().mockReturnValue(undefined) };
    const strategy = new JwtStrategy(cfg as never, prisma as unknown as PrismaService);
    prisma.user.findUnique.mockResolvedValue({
      id: 'u2',
      email: 'z@z.co',
      role: Role.MANAGER,
    });
    await expect(
      strategy.validate({ sub: 'u2', email: 'z@z.co', role: Role.MANAGER }),
    ).resolves.toMatchObject({ sub: 'u2' });
    expect(strategy).toBeDefined();
  });

  it('throws when user records diverge', async () => {
    const cfg = { get: jest.fn().mockReturnValue('sec') };
    const strategy = new JwtStrategy(cfg as never, prisma as unknown as PrismaService);

    prisma.user.findUnique.mockResolvedValue(null);
    await expect(strategy.validate({ sub: 'x', email: 'a', role: Role.USER })).rejects.toThrow(
      UnauthorizedException,
    );

    prisma.user.findUnique.mockResolvedValue({
      id: 'u',
      email: 'a',
      role: Role.ADMIN,
    });
    await expect(strategy.validate({ sub: 'u', email: 'a', role: Role.USER })).rejects.toThrow(
      UnauthorizedException,
    );
    prisma.user.findUnique.mockResolvedValue({
      id: 'u',
      email: 'b',
      role: Role.USER,
    });
    await expect(strategy.validate({ sub: 'u', email: 'a', role: Role.USER })).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
