export interface Clock {
  now(): number;
}

export const systemClock: Clock = { now: () => Date.now() };

/** Manually advanced clock for tests and historical replay. */
export class ManualClock implements Clock {
  constructor(private current: number) {}
  now(): number {
    return this.current;
  }
  set(ms: number): void {
    if (ms < this.current) throw new Error('ManualClock cannot move backwards');
    this.current = ms;
  }
  advance(ms: number): void {
    this.current += ms;
  }
}

export const iso = (ms: number): string => new Date(ms).toISOString();
export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;
