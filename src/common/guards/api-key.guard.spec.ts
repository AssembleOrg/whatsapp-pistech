import { UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiKeyGuard } from './api-key.guard';

describe('ApiKeyGuard', () => {
  const buildContext = (apiKey?: string): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: {
            'x-api-key': apiKey,
          },
        }),
      }),
    } as ExecutionContext;
  };

  it('allows request when API key matches', () => {
    const config = {
      get: jest.fn().mockReturnValue('expected-key'),
    } as unknown as ConfigService;

    const guard = new ApiKeyGuard(config);

    expect(guard.canActivate(buildContext('expected-key'))).toBe(true);
  });

  it('throws UnauthorizedException when key is missing or invalid', () => {
    const config = {
      get: jest.fn().mockReturnValue('expected-key'),
    } as unknown as ConfigService;

    const guard = new ApiKeyGuard(config);

    expect(() => guard.canActivate(buildContext())).toThrow(UnauthorizedException);
    expect(() => guard.canActivate(buildContext('wrong-key'))).toThrow(
      'Invalid API key',
    );
  });
});
