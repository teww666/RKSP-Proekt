import { Role } from '@prisma/client';
import { JwtPayload } from '../auth/jwt.strategy';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController', () => {
  it('returns me', async () => {
    const usersService = { getProfile: jest.fn().mockResolvedValue({ email: 'a' }) };
    const c = new UsersController(usersService as unknown as UsersService);
    const u: JwtPayload = { sub: '1', email: 'a', role: Role.USER };
    await expect(c.me(u)).resolves.toEqual({ email: 'a' });
    expect(usersService.getProfile).toHaveBeenCalledWith('1');
  });
});
