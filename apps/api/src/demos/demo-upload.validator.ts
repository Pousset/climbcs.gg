export type DemoValidationCode =
  'INVALID_EXTENSION' | 'EMPTY_FILE' | 'FILE_TOO_LARGE' | 'LEGACY_CSGO_DEMO' | 'INVALID_HEADER';

export class DemoValidationError extends Error {
  constructor(public readonly code: DemoValidationCode) {
    super(code);
    this.name = 'DemoValidationError';
  }
}

/** Source 2 (CS2) demos start with this 8-byte magic. */
export const CS2_DEMO_MAGIC = 'PBDEMS2\0';
/** Legacy CS:GO demos start with this one and are not supported. */
export const LEGACY_DEMO_MAGIC = 'HL2DEMO\0';

export interface DemoUploadInfo {
  originalName: string;
  size: number;
  /** First bytes of the file (at least 8). */
  header: Buffer;
}

/** Throws a {@link DemoValidationError} when the upload cannot be a valid CS2 demo. */
export function validateDemoUpload(info: DemoUploadInfo, maxBytes: number): void {
  if (!info.originalName.toLowerCase().endsWith('.dem')) {
    throw new DemoValidationError('INVALID_EXTENSION');
  }
  if (info.size <= 0) throw new DemoValidationError('EMPTY_FILE');
  if (info.size > maxBytes) throw new DemoValidationError('FILE_TOO_LARGE');

  const magic = info.header.subarray(0, 8).toString('latin1');
  if (magic === LEGACY_DEMO_MAGIC) throw new DemoValidationError('LEGACY_CSGO_DEMO');
  if (magic !== CS2_DEMO_MAGIC) throw new DemoValidationError('INVALID_HEADER');
}
