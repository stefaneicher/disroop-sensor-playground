// Leading + trailing throttle: fires at once, then at most once per interval with the latest arguments.
export function throttle<A extends unknown[]>(fn: (...args: A) => void, intervalMs: number): (...args: A) => void {
  let last = -Infinity;
  let pending: A | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  return (...args: A) => {
    const wait = last + intervalMs - Date.now();
    if (wait <= 0 && !timer) {
      last = Date.now();
      fn(...args);
      return;
    }
    pending = args;
    timer ??= setTimeout(() => {
      timer = null;
      last = Date.now();
      fn(...pending!);
    }, Math.max(0, wait));
  };
}
