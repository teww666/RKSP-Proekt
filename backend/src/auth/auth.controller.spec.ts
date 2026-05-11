import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  it('delegates to service', async () => {
    const authService = {
      login: jest.fn().mockResolvedValue({ accessToken: 't' }),
      register: jest.fn().mockResolvedValue({ accessToken: 'r' }),
    };
    const controller = new AuthController(authService as unknown as AuthService);
    await expect(controller.login({ email: 'a@b.co', password: 'Password123' })).resolves.toEqual({
      accessToken: 't',
    });
    await expect(controller.register({ email: 'a@b.co', password: 'Password123' })).resolves.toEqual({
      accessToken: 'r',
    });
  });
});
