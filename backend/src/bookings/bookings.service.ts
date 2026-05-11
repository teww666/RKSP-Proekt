import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BookingStatus, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';

@Injectable()
export class BookingsService {
  constructor(private readonly prisma: PrismaService) {}

  async findForActor(actorId: string, actorRole: Role) {
    if (actorRole === Role.USER) {
      return this.prisma.booking.findMany({
        where: { userId: actorId },
        include: { room: true, user: { select: { id: true, email: true, fullName: true, role: true } } },
        orderBy: { startAt: 'asc' },
      });
    }
    return this.prisma.booking.findMany({
      include: { room: true, user: { select: { id: true, email: true, fullName: true, role: true } } },
      orderBy: { startAt: 'asc' },
    });
  }

  async findOne(id: string, actorId: string, actorRole: Role) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: { room: true, user: { select: { id: true, email: true, fullName: true, role: true } } },
    });
    if (!booking) {
      throw new NotFoundException('Бронирование не найдено');
    }
    if (actorRole === Role.USER && booking.userId !== actorId) {
      throw new ForbiddenException('Доступ запрещён');
    }
    return booking;
  }

  async create(dto: CreateBookingDto, actorId: string, actorRole: Role) {
    const ownerId =
      dto.targetUserId !== undefined && dto.targetUserId !== ''
        ? dto.targetUserId
        : actorId;
    if (actorRole === Role.USER && ownerId !== actorId) {
      throw new ForbiddenException('Нельзя создавать бронирование от имени другого пользователя');
    }
    const room = await this.prisma.room.findUnique({ where: { id: dto.roomId } });
    if (!room || !room.isActive) {
      throw new BadRequestException('Комната недоступна для бронирования');
    }
    const owner = await this.prisma.user.findUnique({ where: { id: ownerId } });
    if (!owner) {
      throw new BadRequestException('Указанный пользователь не найден');
    }
    const startAt = new Date(dto.startAt);
    const endAt = new Date(dto.endAt);
    this.assertValidInterval(startAt, endAt, actorRole);
    await this.assertNoOverlap(dto.roomId, startAt, endAt);
    return this.prisma.booking.create({
      data: {
        userId: ownerId,
        roomId: dto.roomId,
        startAt,
        endAt,
        status: BookingStatus.PENDING,
      },
      include: { room: true, user: { select: { id: true, email: true, fullName: true, role: true } } },
    });
  }

  async update(
    id: string,
    dto: UpdateBookingDto,
    actorId: string,
    actorRole: Role,
  ) {
    const existing = await this.findOne(id, actorId, actorRole);
    const startAt = dto.startAt !== undefined ? new Date(dto.startAt) : existing.startAt;
    const endAt = dto.endAt !== undefined ? new Date(dto.endAt) : existing.endAt;
    this.assertValidInterval(startAt, endAt, actorRole);
    if (dto.status !== undefined) {
      if (actorRole === Role.USER) {
        throw new ForbiddenException('Только менеджер или администратор меняют статус');
      }
    } else if (
      actorRole === Role.USER &&
      existing.status !== BookingStatus.PENDING &&
      existing.status !== BookingStatus.CONFIRMED
    ) {
      throw new BadRequestException('Нельзя изменить отменённое бронирование');
    }
    if (dto.startAt !== undefined || dto.endAt !== undefined) {
      await this.assertNoOverlap(existing.roomId, startAt, endAt, id);
    }
    return this.prisma.booking.update({
      where: { id },
      data: {
        ...(dto.startAt !== undefined && { startAt }),
        ...(dto.endAt !== undefined && { endAt }),
        ...(dto.status !== undefined && { status: dto.status }),
      },
      include: { room: true, user: { select: { id: true, email: true, fullName: true, role: true } } },
    });
  }

  async cancel(id: string, actorId: string, actorRole: Role) {
    const existing = await this.findOne(id, actorId, actorRole);
    if (existing.status === BookingStatus.CANCELLED) {
      return existing;
    }
    return this.prisma.booking.update({
      where: { id },
      data: { status: BookingStatus.CANCELLED },
      include: { room: true, user: { select: { id: true, email: true, fullName: true, role: true } } },
    });
  }

  private assertValidInterval(startAt: Date, endAt: Date, actorRole: Role): void {
    if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
      throw new BadRequestException('Некорректные даты');
    }
    if (endAt <= startAt) {
      throw new BadRequestException('Окончание должно быть позже начала');
    }
    if (actorRole === Role.USER) {
      const now = Date.now();
      if (startAt.getTime() < now) {
        throw new BadRequestException('Нельзя бронировать интервал в прошлом');
      }
    }
  }

  private async assertNoOverlap(
    roomId: string,
    startAt: Date,
    endAt: Date,
    excludeBookingId?: string,
  ): Promise<void> {
    const overlapping = await this.prisma.booking.findFirst({
      where: {
        roomId,
        ...(excludeBookingId !== undefined ? { id: { not: excludeBookingId } } : {}),
        status: { not: BookingStatus.CANCELLED },
        AND: [{ startAt: { lt: endAt } }, { endAt: { gt: startAt } }],
      },
    });
    if (overlapping !== null) {
      throw new ConflictException('Время пересекается с существующей бронью');
    }
  }
}
