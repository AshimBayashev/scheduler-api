import { isStrongPassword } from './password-policy';

describe('password policy', () => {
  it('accepts password with letter and digit', () => {
    expect(isStrongPassword('secret12')).toBe(true);
    expect(isStrongPassword('Пароль12')).toBe(true);
  });

  it('rejects short or simple passwords', () => {
    expect(isStrongPassword('secret')).toBe(false);
    expect(isStrongPassword('12345678')).toBe(false);
    expect(isStrongPassword('abcdefgh')).toBe(false);
  });
});
