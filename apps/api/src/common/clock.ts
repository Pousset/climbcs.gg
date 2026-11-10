/** Injectable time source so time-dependent logic (daily quota) is testable. */
export type Clock = () => Date;

export const CLOCK = Symbol('CLOCK');

export const systemClock: Clock = () => new Date();
