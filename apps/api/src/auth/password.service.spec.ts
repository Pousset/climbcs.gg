import { loadEnv } from '../config/env';
import { PasswordService } from './password.service';

describe('PasswordService', () => {
  const service = new PasswordService(loadEnv({ BCRYPT_ROUNDS: '4' }));

  it('never returns the plain password', async () => {
    const hashed = await service.hash('correct horse battery');
    expect(hashed).not.toContain('correct horse battery');
    expect(hashed).toMatch(/^\$2[aby]\$04\$/);
  });

  it('salts every hash', async () => {
    const [a, b] = await Promise.all([
      service.hash('same-password'),
      service.hash('same-password'),
    ]);
    expect(a).not.toBe(b);
  });

  it('verifies a matching password and rejects a wrong one', async () => {
    const hashed = await service.hash('s3cret-value');
    await expect(service.verify('s3cret-value', hashed)).resolves.toBe(true);
    await expect(service.verify('S3cret-value', hashed)).resolves.toBe(false);
  });

  it('rejects a malformed hash instead of throwing', async () => {
    await expect(service.verify('anything', 'not-a-hash')).resolves.toBe(false);
  });
});
