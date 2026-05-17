import { bootstrap } from './bootstrap';

jest.mock('./app.factory', () => ({
  createApp: jest.fn(async () => ({ listen: jest.fn().mockResolvedValue(undefined) })),
  getListenPort: jest.fn(() => 42),
}));

describe('bootstrap', () => {
  it('calls listen with configured port', async () => {
    const listen = jest.fn().mockResolvedValue(undefined);
    const createAppModule = jest.requireMock('./app.factory').createApp as jest.Mock;
    createAppModule.mockResolvedValueOnce({ listen });

    await bootstrap();

    expect(listen).toHaveBeenCalledWith(42, '0.0.0.0');
  });
});
