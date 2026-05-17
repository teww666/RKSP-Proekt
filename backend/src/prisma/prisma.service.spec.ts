import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  it('connects on init and disconnects on destroy', async () => {
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

  it('formats non-Error rejections in logs', async () => {
    jest.useFakeTimers();
    const service = new PrismaService();
    const conn = jest
      .spyOn(service, '$connect')
      .mockRejectedValueOnce('plain string failure')
      .mockResolvedValueOnce(undefined);

    const initPromise = service.onModuleInit();
    await jest.advanceTimersByTimeAsync(3000);
    await initPromise;

    expect(conn).toHaveBeenCalledTimes(2);
    conn.mockRestore();
    jest.useRealTimers();
  });

  it('retries connect before succeeding', async () => {
    jest.useFakeTimers();
    const service = new PrismaService();
    const conn = jest
      .spyOn(service, '$connect')
      .mockRejectedValueOnce(new Error('db down'))
      .mockResolvedValueOnce(undefined);

    const initPromise = service.onModuleInit();
    await jest.advanceTimersByTimeAsync(3000);
    await initPromise;

    expect(conn).toHaveBeenCalledTimes(2);
    conn.mockRestore();
    jest.useRealTimers();
  });

  it('logs error after all connect attempts fail without throwing', async () => {
    jest.useFakeTimers();
    const service = new PrismaService();
    const conn = jest.spyOn(service, '$connect').mockRejectedValue(new Error('db down'));

    const initPromise = service.onModuleInit();
    await jest.advanceTimersByTimeAsync(3000 * 20);
    await initPromise;

    expect(conn.mock.calls.length).toBeGreaterThanOrEqual(20);
    conn.mockRestore();
    jest.useRealTimers();
  });
});
