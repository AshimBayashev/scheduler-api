const DEV_JWT_SECRET = 'scheduler-dev-secret';
const DEV_DB_PASSWORD = 'scheduler';

export function validateEnv(): void {
  const isProd = process.env.NODE_ENV === 'production';
  const jwtSecret = process.env.JWT_SECRET?.trim();
  const dbPassword = process.env.DB_PASSWORD?.trim();

  if (isProd) {
    if (!jwtSecret || jwtSecret === DEV_JWT_SECRET || jwtSecret.length < 32) {
      throw new Error(
        'JWT_SECRET must be a random string of at least 32 characters in production',
      );
    }
    if (!dbPassword || dbPassword === DEV_DB_PASSWORD) {
      throw new Error(
        'DB_PASSWORD must be set to a strong password in production',
      );
    }
    return;
  }

  if (!jwtSecret) {
    process.env.JWT_SECRET = DEV_JWT_SECRET;
  }
}

export function getJwtSecret(): string {
  return process.env.JWT_SECRET ?? DEV_JWT_SECRET;
}
