import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { ZodValidationPipe } from './zod-validation.pipe';

describe('ZodValidationPipe', () => {
  const pipe = new ZodValidationPipe(
    z.object({ name: z.string().trim().min(2), age: z.coerce.number().int().optional() }),
  );

  it('returns the parsed (and transformed) value', () => {
    expect(pipe.transform({ name: '  Al  ', age: '12' })).toEqual({ name: 'Al', age: 12 });
  });

  it('throws a 400 listing every invalid field', () => {
    expect.assertions(3);
    try {
      pipe.transform({ name: 'A', age: 'x' });
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      const body = (error as BadRequestException).getResponse() as {
        message: string;
        issues: { path: string }[];
      };
      expect(body.message).toBe('Validation failed');
      expect(body.issues.map((i) => i.path).sort()).toEqual(['age', 'name']);
    }
  });

  it('rejects non-object payloads', () => {
    expect(() => pipe.transform(undefined)).toThrow(BadRequestException);
    expect(() => pipe.transform('text')).toThrow(BadRequestException);
  });
});
