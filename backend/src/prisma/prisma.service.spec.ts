import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  it('delegates lifecycle hooks', async () => {
    const service = new PrismaService();
    const conn = jest.spyOn(service, '$connect').mockResolvedValue(undefined);
    const disc = jest.spyOn(service, '$disconnect').mockResolvedValue(undefined);

    await service.onModuleInit();
    await service.onModuleDestroy();

    expect(conn).toHaveBeenCalled();
    expect(disc).toHaveBeenCalled();

    conn.mockRestore();
    disc.mockRestore();
  });
});
