import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('responds ok payload', () => {
    expect(new HealthController().check()).toEqual({
      status: 'ok',
      service: 'coworking-booking-api',
    });
  });
});
