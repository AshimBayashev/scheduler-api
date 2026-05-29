import { getJwtSecret, validateEnv } from './validate-env';

const ORIGINAL_ENV = process.env;

describe('validateEnv', () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    delete process.env.NODE_ENV;
    delete process.env.JWT_SECRET;
    delete process.env.DB_PASSWORD;
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('sets dev JWT secret when missing in non-production', () => {
    validateEnv();
    expect(process.env.JWT_SECRET).toBe('scheduler-dev-secret');
  });

  it('throws in production when JWT_SECRET is default', () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'scheduler-dev-secret';
    process.env.DB_PASSWORD = 'strong-production-password';

    expect(() => validateEnv()).toThrow(/JWT_SECRET/);
  });

  it('throws in production when JWT_SECRET is too short', () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'short';
    process.env.DB_PASSWORD = 'strong-production-password';

    expect(() => validateEnv()).toThrow(/JWT_SECRET/);
  });

  it('throws in production when DB_PASSWORD is default', () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'a'.repeat(32);
    process.env.DB_PASSWORD = 'scheduler';

    expect(() => validateEnv()).toThrow(/DB_PASSWORD/);
  });

  it('passes in production with strong secrets', () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'a'.repeat(32);
    process.env.DB_PASSWORD = 'strong-production-password';

    expect(() => validateEnv()).not.toThrow();
  });
});

describe('getJwtSecret', () => {
  it('returns env value or dev fallback', () => {
    process.env.JWT_SECRET = 'custom-secret';
    expect(getJwtSecret()).toBe('custom-secret');
    delete process.env.JWT_SECRET;
    expect(getJwtSecret()).toBe('scheduler-dev-secret');
  });
});
