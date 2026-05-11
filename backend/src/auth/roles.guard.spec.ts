import { BadRequestException, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ROLES_KEY } from './roles.decorator';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  const makeContext = (user?: { sub?: string; role?: Role }): ExecutionContext => {
    return {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    } as unknown as ExecutionContext;
  };

  it('allows when no roles required', () => {
    const reflector = {
      getAllAndMerge: jest.fn().mockReturnValue([]),
    };
    const guard = new RolesGuard(reflector as unknown as Reflector);
    expect(guard.canActivate(makeContext())).toBe(true);
    expect(reflector.getAllAndMerge).toHaveBeenCalledWith(ROLES_KEY, expect.any(Array));
  });

  it('rejects malformed token payload', () => {
    const reflector = {
      getAllAndMerge: jest.fn().mockReturnValue([Role.ADMIN]),
    };
    const guard = new RolesGuard(reflector as unknown as Reflector);
    expect(() => guard.canActivate(makeContext({ role: Role.ADMIN }))).toThrow(BadRequestException);
  });

  it('rejects forbidden role', () => {
    const reflector = {
      getAllAndMerge: jest.fn().mockReturnValue([Role.ADMIN]),
    };
    const guard = new RolesGuard(reflector as unknown as Reflector);
    expect(() =>
      guard.canActivate(makeContext({ sub: '1', role: Role.USER })),
    ).toThrow(ForbiddenException);
  });

  it('allows matching role', () => {
    const reflector = {
      getAllAndMerge: jest.fn().mockReturnValue([Role.MANAGER, Role.ADMIN]),
    };
    const guard = new RolesGuard(reflector as unknown as Reflector);
    expect(guard.canActivate(makeContext({ sub: '1', role: Role.ADMIN }))).toBe(true);
  });
});
