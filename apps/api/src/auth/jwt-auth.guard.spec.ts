import { extractBearerToken } from './jwt-auth.guard';

describe('extractBearerToken', () => {
  it('returns the token of a well-formed header', () => {
    expect(extractBearerToken('Bearer abc.def.ghi')).toBe('abc.def.ghi');
    expect(extractBearerToken('bearer   token')).toBe('token');
  });

  it.each([undefined, '', 'Bearer', 'Basic abc', 'Bearer a b', 'abc'])(
    'returns null for %p',
    (value) => {
      expect(extractBearerToken(value)).toBeNull();
    },
  );
});
