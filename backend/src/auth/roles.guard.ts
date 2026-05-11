import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { Request } from 'express';
import { ROLES_KEY } from './roles.decorator';

interface JwtUserPayload {
  sub?: string;
  role?: Role;
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndMerge<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (requiredRoles.length === 0) {
      return true;
    }
    const req = context.switchToHttp().getRequest<Request>();
    const user = req.user as JwtUserPayload | undefined;
    if (!user?.sub || !user?.role) {
      throw new BadRequestException('Некорректные данные учётной записи в токене');
    }
    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException('Недостаточно прав для выполнения операции');
    }
    return true;
  }
}
