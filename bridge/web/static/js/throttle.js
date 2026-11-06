// Leading + trailing throttle: fires at once, then at most once per interval with the latest arguments.
export function throttle(fn, intervalMs) {
  let last = -Infinity;
  let pending = null;
  let timer = null;

  return (...args) => {
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
      fn(...pending);
    }, Math.max(0, wait));
  };
}
