import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('Admin123!', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@coworking.local' },
    update: {},
    create: {
      email: 'admin@coworking.local',
      passwordHash,
      fullName: 'Администратор',
      role: Role.ADMIN,
    },
  });

  const manager = await prisma.user.upsert({
    where: { email: 'manager@coworking.local' },
    update: {},
    create: {
      email: 'manager@coworking.local',
      passwordHash: await bcrypt.hash('Manager123!', 10),
      fullName: 'Менеджер переговорных',
      role: Role.MANAGER,
    },
  });

  const user = await prisma.user.upsert({
    where: { email: 'user@coworking.local' },
    update: {},
    create: {
      email: 'user@coworking.local',
      passwordHash: await bcrypt.hash('User123!', 10),
      fullName: 'Пользователь',
      role: Role.USER,
    },
  });

  if ((await prisma.room.count()) === 0) {
    const rooms = [
      {
        name: 'Переговорная «Альфа»',
        capacity: 6,
        description: 'Проектор, флипчарт',
        location: '3 этаж, блок А',
      },
      {
        name: 'Комната «Бета»',
        capacity: 12,
        description: 'Видеоконференция',
        location: '4 этаж',
      },
      {
        name: 'Тихая кабина «Гамма»',
        capacity: 3,
        description: 'Фокус-работа',
        location: '2 этаж, коворкинг',
      },
    ];

    for (const r of rooms) {
      await prisma.room.create({ data: r });
    }
  }

  if ((await prisma.booking.count()) === 0) {
    const roomList = await prisma.room.findMany({ take: 2 });
    if (roomList.length >= 2) {
      const start = new Date();
      start.setDate(start.getDate() + 1);
      start.setHours(10, 0, 0, 0);
      const end = new Date(start);
      end.setHours(11, 0, 0, 0);
      await prisma.booking.create({
        data: {
          userId: user.id,
          roomId: roomList[0].id,
          startAt: start,
          endAt: end,
          status: 'CONFIRMED',
        },
      });

      await prisma.booking.create({
        data: {
          userId: manager.id,
          roomId: roomList[1].id,
          startAt: start,
          endAt: end,
          status: 'PENDING',
        },
      });
    }
  }

  // eslint-disable-next-line no-console
  console.log('Seed OK', { admin: admin.email, manager: manager.email, user: user.email });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
