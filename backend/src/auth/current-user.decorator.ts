import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtPayload } from './jwt.strategy';

export function resolveCurrentUserFromContext(ctx: ExecutionContext): JwtPayload {
  const request = ctx.switchToHttp().getRequest<{ user: JwtPayload }>();
  return request.user;
}

export const currentUserParamFactory = (
  _data: unknown,
  ctx: ExecutionContext,
): JwtPayload => resolveCurrentUserFromContext(ctx);

export const CurrentUser = createParamDecorator(currentUserParamFactory);
