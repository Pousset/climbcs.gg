import { z } from 'zod';

export const usernameSchema = z
  .string()
  .trim()
  .min(3, 'must be at least 3 characters')
  .max(20, 'must be at most 20 characters')
  .regex(/^[A-Za-z0-9_]+$/, 'may only contain letters, digits and underscores');

/** 72 is the maximum number of bytes bcrypt takes into account. */
export const passwordSchema = z
  .string()
  .min(8, 'must be at least 8 characters')
  .max(72, 'must be at most 72 characters');

export const registerSchema = z.object({ username: usernameSchema, password: passwordSchema });

export const loginSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
