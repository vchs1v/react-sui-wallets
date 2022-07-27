export const mockIdleCallback = () => {
  global.requestIdleCallback = (cb, options) => setTimeout(cb, options?.timeout);
  global.cancelIdleCallback = clearTimeout;
};
