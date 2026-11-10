import {
  CS2_DEMO_MAGIC,
  DemoValidationError,
  LEGACY_DEMO_MAGIC,
  validateDemoUpload,
} from './demo-upload.validator';
import type { DemoUploadInfo } from './demo-upload.validator';

const MAX = 1000;
const valid = (overrides: Partial<DemoUploadInfo> = {}): DemoUploadInfo => ({
  originalName: 'match.dem',
  size: 500,
  header: Buffer.from(`${CS2_DEMO_MAGIC}rest`, 'latin1'),
  ...overrides,
});

const codeOf = (info: DemoUploadInfo): string | undefined => {
  try {
    validateDemoUpload(info, MAX);
  } catch (error) {
    return (error as DemoValidationError).code;
  }
  return undefined;
};

describe('validateDemoUpload', () => {
  it('accepts a CS2 demo within the size limit', () => {
    expect(codeOf(valid())).toBeUndefined();
    expect(codeOf(valid({ originalName: 'MATCH.DEM', size: MAX }))).toBeUndefined();
  });

  it('rejects other extensions', () => {
    expect(codeOf(valid({ originalName: 'match.zip' }))).toBe('INVALID_EXTENSION');
    expect(codeOf(valid({ originalName: 'dem' }))).toBe('INVALID_EXTENSION');
  });

  it('rejects empty and oversized files', () => {
    expect(codeOf(valid({ size: 0 }))).toBe('EMPTY_FILE');
    expect(codeOf(valid({ size: MAX + 1 }))).toBe('FILE_TOO_LARGE');
  });

  it('recognises legacy CS:GO demos explicitly', () => {
    const header = Buffer.from(`${LEGACY_DEMO_MAGIC}rest`, 'latin1');
    expect(codeOf(valid({ header }))).toBe('LEGACY_CSGO_DEMO');
  });

  it('rejects files with an unknown or too short header', () => {
    expect(codeOf(valid({ header: Buffer.from('MZ\u0090\u0000garbage', 'latin1') }))).toBe(
      'INVALID_HEADER',
    );
    expect(codeOf(valid({ header: Buffer.from('PBDEMS2') }))).toBe('INVALID_HEADER');
  });

  it('exposes the validation code on the error', () => {
    const error = new DemoValidationError('EMPTY_FILE');
    expect(error.code).toBe('EMPTY_FILE');
    expect(error).toBeInstanceOf(Error);
  });
});
