import { BookingStatus, Role } from '@prisma/client';
import { JwtPayload } from '../auth/jwt.strategy';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';

describe('BookingsController', () => {
  const user: JwtPayload = { sub: 'u', email: 'a@b.co', role: Role.USER };
  let bookings: BookingsService;
  let controller: BookingsController;

  beforeEach(() => {
    bookings = {
      findForActor: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue({ id: 'b' }),
      create: jest.fn().mockResolvedValue({ id: 'c' }),
      update: jest.fn().mockResolvedValue({ id: 'd' }),
      cancel: jest.fn().mockResolvedValue({ id: 'e' }),
    } as unknown as BookingsService;

    controller = new BookingsController(bookings);
  });

  it('proxies bookings operations', async () => {
    await controller.findMyAndAll(user);
    await controller.findOne('b', user);
    await controller.create(
      {
        roomId: '00000000-0000-4000-8000-0000000000aa',
        startAt: '2026-06-01T10:00:00.000Z',
        endAt: '2026-06-01T11:00:00.000Z',
      },
      user,
    );
    await controller.update('b', { status: BookingStatus.CONFIRMED }, { ...user, role: Role.MANAGER });
    await controller.confirm('b', { ...user, role: Role.MANAGER });
    await controller.remove('b', user);
    expect(bookings.cancel).toHaveBeenCalledWith('b', 'u', Role.USER);
  });
});
