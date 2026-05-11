import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { BookingStatus, Role } from '@prisma/client';
import { BookingsService } from './bookings.service';
import { PrismaService } from '../prisma/prisma.service';

describe('BookingsService', () => {
  let svc: BookingsService;
  const prisma = {
    booking: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    room: { findUnique: jest.fn() },
    user: { findUnique: jest.fn() },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    svc = new BookingsService(prisma as unknown as PrismaService);
  });

  it('filters USER bookings', async () => {
    prisma.booking.findMany.mockResolvedValue([]);
    await svc.findForActor('u1', Role.USER);
    expect(prisma.booking.findMany.mock.calls[0][0].where?.userId).toBe('u1');
  });

  it('returns all for MANAGER', async () => {
    prisma.booking.findMany.mockResolvedValue([]);
    await svc.findForActor('u1', Role.MANAGER);
    expect(prisma.booking.findMany.mock.calls[0][0].where).toBeUndefined();
  });

  it('throws when booking missing', async () => {
    prisma.booking.findUnique.mockResolvedValue(null);
    await expect(svc.findOne('id', 'u', Role.USER)).rejects.toThrow(NotFoundException);
  });

  it('returns booking for owner USER', async () => {
    prisma.booking.findUnique.mockResolvedValue({
      id: 'b',
      userId: 'u',
      status: BookingStatus.PENDING,
      startAt: new Date(),
      endAt: new Date(),
      room: {},
      roomId: 'r',
    });
    await expect(svc.findOne('b', 'u', Role.USER)).resolves.toMatchObject({ id: 'b' });
  });

  it('blocks foreign booking for USER', async () => {
    prisma.booking.findUnique.mockResolvedValue({
      id: 'id',
      userId: 'other',
      status: BookingStatus.PENDING,
      startAt: new Date(),
      endAt: new Date(),
      room: {},
      roomId: 'r',
    });
    await expect(svc.findOne('id', 'u', Role.USER)).rejects.toThrow(ForbiddenException);
  });

  it('treats empty targetUserId as self even for ADMIN', async () => {
    prisma.room.findUnique.mockResolvedValue({ id: 'r', isActive: true });
    prisma.user.findUnique.mockResolvedValue({ id: 'adm' });
    prisma.booking.findFirst.mockResolvedValue(null);
    prisma.booking.create.mockResolvedValue({ ok: true });
    await svc.create(
      {
        roomId: '00000000-0000-4000-8000-000000000001',
        startAt: '2099-01-01T10:00:00.000Z',
        endAt: '2099-01-01T11:00:00.000Z',
        targetUserId: '',
      },
      'adm',
      Role.ADMIN,
    );
    expect(prisma.booking.create.mock.calls[0][0].data.userId).toBe('adm');
  });

  it('ADMIN can create for third party and ignore past restriction', async () => {
    const pastStart = new Date(Date.now() - 86_400_000);
    const pastEnd = new Date(pastStart.getTime() + 3_600_000);
    prisma.room.findUnique.mockResolvedValue({ id: 'r', isActive: true });
    prisma.user.findUnique.mockResolvedValue({ id: 'u2' });
    prisma.booking.findFirst.mockResolvedValue(null);
    prisma.booking.create.mockResolvedValue({});
    await expect(
      svc.create(
        {
          roomId: 'r',
          startAt: pastStart.toISOString(),
          endAt: pastEnd.toISOString(),
          targetUserId: 'u2',
        },
        'admin-id',
        Role.ADMIN,
      ),
    ).resolves.toEqual({});
    expect(prisma.booking.create).toHaveBeenCalled();
  });

  it('USER cannot supply targetUserId', async () => {
    await expect(
      svc.create(
        {
          roomId: '00000000-0000-4000-8000-000000000001',
          startAt: '2099-01-01T10:00:00.000Z',
          endAt: '2099-01-01T11:00:00.000Z',
          targetUserId: '00000000-0000-4000-8000-000000000002',
        },
        'u',
        Role.USER,
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rejects inactive room', async () => {
    prisma.room.findUnique.mockResolvedValue({ id: 'r', isActive: false });
    await expect(
      svc.create(
        {
          roomId: '00000000-0000-4000-8000-000000000001',
          startAt: '2099-01-01T10:00:00.000Z',
          endAt: '2099-01-01T11:00:00.000Z',
        },
        'u',
        Role.USER,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('requires existing owner target', async () => {
    prisma.room.findUnique.mockResolvedValue({ id: 'r', isActive: true });
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(
      svc.create(
        {
          roomId: '00000000-0000-4000-8000-000000000001',
          startAt: '2099-01-01T10:00:00.000Z',
          endAt: '2099-01-01T11:00:00.000Z',
          targetUserId: '00000000-0000-4000-8000-000000000002',
        },
        'admin',
        Role.ADMIN,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('detects overlaps excluding cancelled bookings', async () => {
    prisma.room.findUnique.mockResolvedValue({ id: 'r', isActive: true });
    prisma.user.findUnique.mockResolvedValue({ id: 'u' });
    prisma.booking.findFirst.mockResolvedValue({ id: 'clash' });

    await expect(
      svc.create(
        {
          roomId: '00000000-0000-4000-8000-000000000001',
          startAt: '2099-01-01T10:00:00.000Z',
          endAt: '2099-01-01T11:00:00.000Z',
        },
        'u',
        Role.USER,
      ),
    ).rejects.toThrow(ConflictException);

    prisma.booking.findFirst.mockResolvedValue(null);
    prisma.booking.create.mockResolvedValue({ id: 'b' });

    await expect(
      svc.create(
        {
          roomId: '00000000-0000-4000-8000-000000000001',
          startAt: '2099-01-01T10:00:00.000Z',
          endAt: '2099-01-01T11:00:00.000Z',
        },
        'u',
        Role.USER,
      ),
    ).resolves.toEqual({ id: 'b' });

    const where = prisma.booking.findFirst.mock.calls[0][0].where as {
      status: { not: BookingStatus };
    };
    expect(where.status.not).toBe(BookingStatus.CANCELLED);
  });

  it('validates malformed dates and ordering', async () => {
    prisma.room.findUnique.mockResolvedValue({ id: 'r', isActive: true });
    prisma.user.findUnique.mockResolvedValue({ id: 'u' });
    await expect(
      svc.create(
        {
          roomId: '00000000-0000-4000-8000-000000000001',
          startAt: 'bad',
          endAt: '2099-01-01T11:00:00.000Z',
        },
        'u',
        Role.USER,
      ),
    ).rejects.toThrow(BadRequestException);

    await expect(
      svc.create(
        {
          roomId: '00000000-0000-4000-8000-000000000001',
          startAt: '2099-01-01T11:00:00.000Z',
          endAt: '2099-01-01T10:00:00.000Z',
        },
        'u',
        Role.USER,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('blocks past USER bookings', async () => {
    prisma.room.findUnique.mockResolvedValue({ id: 'r', isActive: true });
    prisma.user.findUnique.mockResolvedValue({ id: 'u' });

    await expect(
      svc.create(
        {
          roomId: '00000000-0000-4000-8000-000000000001',
          startAt: '2020-01-01T10:00:00.000Z',
          endAt: '2020-01-01T11:00:00.000Z',
        },
        'u',
        Role.USER,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('blocks USER tweaks on cancelled bookings', async () => {
    prisma.booking.findUnique.mockResolvedValue({
      id: 'dead',
      userId: 'u',
      roomId: 'r',
      status: BookingStatus.CANCELLED,
      startAt: new Date('2099-01-01T10:00:00.000Z'),
      endAt: new Date('2099-01-01T11:00:00.000Z'),
    });
    await expect(
      svc.update(
        'dead',
        { startAt: '2099-01-01T10:30:00.000Z' },
        'u',
        Role.USER,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('USER cannot change booking status updates', async () => {
    const existing = {
      id: 'b1',
      userId: 'u',
      roomId: 'r',
      status: BookingStatus.PENDING,
      startAt: new Date('2099-01-01T10:00:00.000Z'),
      endAt: new Date('2099-01-01T11:00:00.000Z'),
    };
    prisma.booking.findUnique.mockResolvedValue(existing);
    await expect(svc.update('b1', { status: BookingStatus.CONFIRMED }, 'u', Role.USER)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('recomputes overlaps when timings change', async () => {
    const existing = {
      id: 'b1',
      userId: 'u',
      roomId: 'r',
      status: BookingStatus.CONFIRMED,
      startAt: new Date('2099-01-01T10:00:00.000Z'),
      endAt: new Date('2099-01-01T11:00:00.000Z'),
    };
    prisma.booking.findUnique.mockResolvedValue(existing);
    prisma.booking.findFirst.mockResolvedValue(null);
    prisma.booking.update.mockResolvedValue({ ...existing });
    await svc.update(
      'b1',
      { startAt: '2099-01-01T11:30:00.000Z', endAt: '2099-01-01T12:30:00.000Z' },
      'u',
      Role.USER,
    );
    expect(prisma.booking.findFirst).toHaveBeenCalled();
  });

  it('updates only status without checking overlap', async () => {
    const existing = {
      id: 'b1',
      userId: 'u',
      roomId: 'r',
      status: BookingStatus.PENDING,
      startAt: new Date('2099-01-01T10:00:00.000Z'),
      endAt: new Date('2099-01-01T11:00:00.000Z'),
    };
    prisma.booking.findUnique.mockResolvedValue(existing);
    prisma.booking.update.mockResolvedValue({ ...existing, status: BookingStatus.CONFIRMED });
    await svc.update('b1', { status: BookingStatus.CONFIRMED }, 'm', Role.MANAGER);
    expect(prisma.booking.findFirst).not.toHaveBeenCalled();
    expect(prisma.booking.update.mock.calls[0][0].data.status).toBe(BookingStatus.CONFIRMED);
  });

  it('USER blocked from altering cancelled bookings', async () => {
    const existing = {
      id: 'b1',
      userId: 'u',
      roomId: 'r',
      status: BookingStatus.CANCELLED,
      startAt: new Date('2099-01-01T10:00:00.000Z'),
      endAt: new Date('2099-01-01T11:00:00.000Z'),
    };
    prisma.booking.findUnique.mockResolvedValue(existing);
    await expect(
      svc.update('b1', { startAt: '2099-01-01T10:30:00.000Z' }, 'u', Role.USER),
    ).rejects.toThrow(BadRequestException);
  });

  it('cancelling returns same booking when already cancelled', async () => {
    prisma.booking.findUnique.mockResolvedValue({
      id: 'b',
      status: BookingStatus.CANCELLED,
      userId: 'u',
    });
    const res = await svc.cancel('b', 'u', Role.USER);
    expect(res.status).toBe(BookingStatus.CANCELLED);
  });

  it('USER cannot inspect foreign bookings to cancel while MANAGER can', async () => {
    prisma.booking.findUnique.mockResolvedValue({
      id: 'b',
      status: BookingStatus.PENDING,
      userId: 'other',
      startAt: new Date(),
      endAt: new Date(),
      room: {},
      roomId: 'r',
    });
    await expect(svc.cancel('b', 'u', Role.USER)).rejects.toThrow(ForbiddenException);

    prisma.booking.findUnique.mockResolvedValue({
      id: 'b',
      status: BookingStatus.PENDING,
      userId: 'other',
      startAt: new Date(),
      endAt: new Date(),
      room: {},
      roomId: 'r',
    });
    prisma.booking.update.mockResolvedValue({
      id: 'b',
      status: BookingStatus.CANCELLED,
    });
    await expect(svc.cancel('b', 'm', Role.MANAGER)).resolves.toMatchObject({
      status: BookingStatus.CANCELLED,
    });
  });
});
