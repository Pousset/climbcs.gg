import { loginSchema, passwordSchema, registerSchema, usernameSchema } from './auth.schemas';

describe('usernameSchema', () => {
  it.each(['abc', 'Mathis_42', 'A'.repeat(20)])('accepts %s', (value) => {
    expect(usernameSchema.safeParse(value).success).toBe(true);
  });

  it.each(['ab', 'A'.repeat(21), 'with space', 'émile', 'bad-dash', ''])(
    'rejects "%s"',
    (value) => {
      expect(usernameSchema.safeParse(value).success).toBe(false);
    },
  );

  it('trims surrounding spaces', () => {
    expect(usernameSchema.parse('  mathis ')).toBe('mathis');
  });
});

describe('passwordSchema', () => {
  it('enforces length bounds', () => {
    expect(passwordSchema.safeParse('1234567').success).toBe(false);
    expect(passwordSchema.safeParse('12345678').success).toBe(true);
    expect(passwordSchema.safeParse('x'.repeat(72)).success).toBe(true);
    expect(passwordSchema.safeParse('x'.repeat(73)).success).toBe(false);
  });
});

describe('registerSchema / loginSchema', () => {
  it('requires both fields on registration', () => {
    expect(registerSchema.safeParse({ username: 'valid_name' }).success).toBe(false);
    expect(
      registerSchema.safeParse({ username: 'valid_name', password: 'longenough' }).success,
    ).toBe(true);
  });

  it('only requires non-empty credentials on login', () => {
    expect(loginSchema.safeParse({ username: 'x', password: 'y' }).success).toBe(true);
    expect(loginSchema.safeParse({ username: '', password: 'y' }).success).toBe(false);
  });
});
