import { validateEnv } from './env.config';

describe('validateEnv', () => {
  it('applies defaults and parses numeric values', () => {
    const env = validateEnv({
      API_KEY: '12345678',
      QR_PASSWORD: 'abcd',
      PORT: '4000',
      MESSAGE_DELAY_MIN: '100',
      MESSAGE_DELAY_MAX: '200',
    });

    expect(env.PORT).toBe(4000);
    expect(env.NODE_ENV).toBe('development');
    expect(env.AUTH_DIR).toBe('./auth_info');
    expect(env.ALLOWED_ORIGINS).toBe('*');
    expect(env.MESSAGE_DELAY_MIN).toBe(100);
    expect(env.MESSAGE_DELAY_MAX).toBe(200);
  });

  it('throws when required values are invalid', () => {
    expect(() =>
      validateEnv({
        API_KEY: 'short',
        QR_PASSWORD: 'abc',
      }),
    ).toThrow('Environment validation failed');
  });
});
