import type { ReplayData } from '@cs2/core';

/** Turns a `.dem` file on disk into the parser-independent replay model. */
export interface DemoParser {
  parse(filePath: string): Promise<ReplayData>;
}

export const DEMO_PARSER = Symbol('DEMO_PARSER');

export type DemoParseErrorCode = 'NO_ROUNDS' | 'PARSE_FAILED';

export class DemoParseError extends Error {
  constructor(
    public readonly code: DemoParseErrorCode,
    cause?: unknown,
  ) {
    super(code, { cause });
    this.name = 'DemoParseError';
  }
}
