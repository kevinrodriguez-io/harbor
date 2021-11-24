export type Logger = {
  log: (...args: any[]) => Promise<void>;
  error: (...args: any[]) => Promise<void>;
};
