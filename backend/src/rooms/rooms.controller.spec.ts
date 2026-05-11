import { RoomsController } from './rooms.controller';
import { RoomsService } from './rooms.service';

describe('RoomsController', () => {
  let controller: RoomsController;
  let rooms: RoomsService;

  beforeEach(() => {
    rooms = {
      findAll: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue({ id: '1' }),
      create: jest.fn().mockResolvedValue({ id: 'new' }),
      update: jest.fn().mockResolvedValue({ id: '1' }),
      remove: jest.fn().mockResolvedValue({ ok: true }),
    } as unknown as RoomsService;
    controller = new RoomsController(rooms);
  });

  it('CRUD wrappers', async () => {
    await controller.findAll();
    await controller.findOne('1');
    await controller.create({ name: 'a', capacity: 1 });
    await controller.update('1', { name: 'b' });
    await controller.remove('1');
    expect(rooms.remove).toHaveBeenCalledWith('1');
  });
});
