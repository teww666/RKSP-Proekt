/**
 * Фуззинг доменного слоя: случайные DTO не должны приводить к «немым» ошибкам.
 * Файл исключается из `npm run test:phase` по шаблону `fuzz`.
 */
import { HttpException } from '@nestjs/common';
import * as fc from 'fast-check';
import { Role } from '@prisma/client';
import { BookingsService } from './bookings.service';
import type { CreateBookingDto } from './dto/create-booking.dto';
import type { PrismaService } from '../prisma/prisma.service';

describe('fuzz BookingsService#create', () => {
  const prismaStub = (): PrismaService =>
    ({
      booking: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(null),
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({}),
        update: jest.fn().mockResolvedValue({}),
      },
      room: { findUnique: jest.fn().mockResolvedValue({ id: 'r', isActive: true }) },
      user: { findUnique: jest.fn().mockResolvedValue({ id: 'target' }) },
    }) as unknown as PrismaService;

  const randomIsoDates = (): fc.Arbitrary<[string, string]> =>
    fc
      .tuple(fc.nat({ max: 1_700_000_000 }), fc.nat({ max: 86_400 }))
      .map(([start, dur]) => {
        const base = start * 1000;
        return [new Date(base).toISOString(), new Date(base + (dur + 1) * 1000).toISOString()];
      });

  const bookingDtoArbitrary: fc.Arbitrary<CreateBookingDto> = fc
    .record({
      roomId: fc.uuid(),
      scheduling: randomIsoDates(),
      maybeTargetUserId: fc.option(fc.uuid(), { nil: undefined }),
    })
    .map((x) => ({
      roomId: x.roomId,
      startAt: x.scheduling[0],
      endAt: x.scheduling[1],
      ...(x.maybeTargetUserId ? { targetUserId: x.maybeTargetUserId } : {}),
    }));

  it('create handles arbitrary payloads without crashing', async () => {
    await fc.assert(
      fc.asyncProperty(
        bookingDtoArbitrary,
        fc.constantFrom(Role.USER, Role.MANAGER, Role.ADMIN),
        fc.uuid(),
        async (dto, role, actorId) => {
          const svc = new BookingsService(prismaStub());
          try {
            await svc.create(dto, actorId, role);
          } catch (e) {
            if (!(e instanceof HttpException)) {
              throw e;
            }
          }
        },
      ),
      { numRuns: 30 },
    );
  });
});
