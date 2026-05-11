import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { JwtAuthGuard } from './jwt-auth.guard';
import { IS_PUBLIC_KEY } from './public.decorator';

/** Passport возвращает миксины с «узкими» типами — для теста достаточно прототипа. */
type GuardProto = { canActivate: (...args: unknown[]) => unknown };
const JwtMixedGuard = AuthGuard('jwt');

describe('JwtAuthGuard', () => {
  const execCtx = (): ExecutionContext =>
    ({ getHandler: () => ({}), getClass: () => ({}) } as ExecutionContext);

  const mixedProto = JwtMixedGuard.prototype as GuardProto;

  it('allows public routes', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(true) };
    const guard = new JwtAuthGuard(reflector as unknown as Reflector);
    const spy = jest.spyOn(mixedProto, 'canActivate');
    guard.canActivate(execCtx());
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('delegates to passport for protected routes', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(false) };
    const guard = new JwtAuthGuard(reflector as unknown as Reflector);
    const spy = jest.spyOn(mixedProto, 'canActivate').mockImplementation(() => true);
    guard.canActivate(execCtx());
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('queries reflector metadata', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(true) };
    const guard = new JwtAuthGuard(reflector as unknown as Reflector);
    guard.canActivate(execCtx());
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, expect.any(Array));
  });
});
