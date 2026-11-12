export interface RecordedCall {
  name: string;
  args: unknown[];
  fillStyle: unknown;
  strokeStyle: unknown;
  alpha: unknown;
}

/** Fake CanvasRenderingContext2D that records every method call with the style at that time. */
export function createRecordingContext() {
  const calls: RecordedCall[] = [];
  const state: Record<string, unknown> = { globalAlpha: 1 };
  const ctx = new Proxy(state, {
    get(target, prop: string) {
      if (prop in target) return target[prop];
      return (...args: unknown[]) => {
        calls.push({
          name: prop,
          args,
          fillStyle: target['fillStyle'],
          strokeStyle: target['strokeStyle'],
          alpha: target['globalAlpha'],
        });
      };
    },
    set(target, prop: string, value) {
      target[prop] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  return { ctx, calls, named: (name: string) => calls.filter((c) => c.name === name) };
}
