import { NotFoundException } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { PrismaService } from '../prisma/prisma.service';

describe('RoomsService', () => {
  const prisma = {
    room: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };
  let svc: RoomsService;

  beforeEach(() => {
    jest.clearAllMocks();
    svc = new RoomsService(prisma as unknown as PrismaService);
  });

  it('findAll delegates', async () => {
    prisma.room.findMany.mockResolvedValue([]);
    await expect(svc.findAll()).resolves.toEqual([]);
    expect(prisma.room.findMany).toHaveBeenCalledWith({ orderBy: { createdAt: 'desc' } });
  });

  it('findOne throws NotFoundException', async () => {
    prisma.room.findUnique.mockResolvedValue(null);
    await expect(svc.findOne('x')).rejects.toThrow(NotFoundException);
  });

  it('findOne returns room', async () => {
    const room = { id: 'x' };
    prisma.room.findUnique.mockResolvedValue(room);
    await expect(svc.findOne('x')).resolves.toEqual(room);
  });

  it('applies sane defaults when optional fields omitted', async () => {
    prisma.room.create.mockResolvedValue({ id: '1' });
    await svc.create({ name: 'Solo', capacity: 9 });
    const data = prisma.room.create.mock.calls[0][0].data as Record<string, unknown>;
    expect(data.description).toBeNull();
    expect(data.location).toBeNull();
    expect(data.isActive).toBe(true);
  });

  it('creates with trimmed strings', async () => {
    prisma.room.create.mockResolvedValue({ id: '1' });
    await svc.create({
      name: '  A ',
      capacity: 2,
      description: '  d ',
      location: '  L ',
      isActive: true,
    });
    expect(prisma.room.create.mock.calls[0][0].data.name).toBe('A');
  });

  it('normalizes explicit null payloads from partial PATCH bodies', async () => {
    prisma.room.findUnique.mockResolvedValue({ id: '1' });
    prisma.room.update.mockResolvedValue({});
    await svc.update('1', { description: null as unknown as string });
    await svc.update('1', { location: null as unknown as string });
    expect((prisma.room.update.mock.calls[0][0].data as Record<string, unknown>).description).toBeNull();
    expect((prisma.room.update.mock.calls[1][0].data as Record<string, unknown>).location).toBeNull();
  });

  it('renames-only update touches name branch', async () => {
    prisma.room.findUnique.mockResolvedValue({ id: '1' });
    prisma.room.update.mockResolvedValue({});
    await svc.update('1', { name: '  OnlyName ' });
    expect(prisma.room.update.mock.calls[0][0].data).toMatchObject({
      name: 'OnlyName',
    });
  });

  it('trims descriptive fields to nullable strings', async () => {
    prisma.room.findUnique.mockResolvedValue({ id: '1' });
    prisma.room.update.mockResolvedValue({});
    await svc.update('1', { description: '   ', location: '\t\t' });
    expect(prisma.room.update.mock.calls[0][0].data).toMatchObject({
      description: '',
      location: '',
    });
  });

  it('updates merges optional fields', async () => {
    prisma.room.findUnique.mockResolvedValue({ id: '1' });
    prisma.room.update.mockResolvedValue({});
    await svc.update('1', { capacity: 3 });
    await svc.update('1', { description: '', name: undefined });
    await svc.update('1', { location: '', isActive: false });
    await svc.update('1', { description: undefined as unknown as string }); // сохранить старое описание без перезаписи
    const lastPayload = prisma.room.update.mock.calls.pop()?.[0] as {
      data: Record<string, unknown>;
    };
    expect(lastPayload.data).not.toHaveProperty('description');
  });

  it('remove deletes', async () => {
    prisma.room.findUnique.mockResolvedValue({ id: '1' });
    prisma.room.delete.mockResolvedValue({});
    await expect(svc.remove('1')).resolves.toEqual({ ok: true });
  });
});
