import { ExecutionContext } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtPayload } from './jwt.strategy';
import { currentUserParamFactory, resolveCurrentUserFromContext } from './current-user.decorator';

describe('CurrentUser decorators', () => {
  const payload: JwtPayload = { sub: '1', email: 'a@b.co', role: Role.USER };
  const ctx = {
    switchToHttp: () => ({ getRequest: () => ({ user: payload }) }),
  } as unknown as ExecutionContext;

  it('resolveCurrentUserFromContext reads nested user', () => {
    expect(resolveCurrentUserFromContext(ctx)).toBe(payload);
  });

  it('delegates through param factory shim', () => {
    expect(currentUserParamFactory(undefined, ctx)).toBe(payload);
  });
});
