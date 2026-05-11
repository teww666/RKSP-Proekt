import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { createApp, getListenPort } from './app.factory';

jest.mock('@nestjs/core', () => ({
  NestFactory: { create: jest.fn() },
}));

describe('createApp', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('configures CORS list from env when CORS_ORIGIN is set', async () => {
    process.env.CORS_ORIGIN = 'http://localhost:5173 , http://localhost:4173 ';
    const useGlobalPipes = jest.fn();
    const enableCors = jest.fn();
    const create = NestFactory.create as jest.Mock;
    create.mockResolvedValue({ useGlobalPipes, enableCors });
    await createApp();
    expect(enableCors).toHaveBeenCalledWith({
      origin: ['http://localhost:5173', 'http://localhost:4173'],
      credentials: true,
    });
    expect(useGlobalPipes.mock.calls[0][0]).toBeInstanceOf(ValidationPipe);
  });

  it('allows all origins when CORS_ORIGIN is unset', async () => {
    delete process.env.CORS_ORIGIN;
    const useGlobalPipes = jest.fn();
    const enableCors = jest.fn();
    const create = NestFactory.create as jest.Mock;
    create.mockResolvedValue({ useGlobalPipes, enableCors });
    await createApp();
    expect(enableCors).toHaveBeenCalledWith({ origin: true, credentials: true });
  });
});

describe('getListenPort', () => {
  const originalEnv = process.env.PORT;

  afterEach(() => {
    process.env.PORT = originalEnv;
  });

  it('parses PORT from env', () => {
    process.env.PORT = '9000';
    expect(getListenPort()).toBe(9000);
  });

  it('defaults to 4000', () => {
    delete process.env.PORT;
    expect(getListenPort()).toBe(4000);
  });
});
