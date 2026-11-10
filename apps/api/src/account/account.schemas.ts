import { z } from 'zod';

export const setPlanSchema = z.object({ plan: z.enum(['free', 'premium']) });

export type SetPlanInput = z.infer<typeof setPlanSchema>;
