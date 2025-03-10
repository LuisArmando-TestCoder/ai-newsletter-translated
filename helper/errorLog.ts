// Helper: Log errors with timestamp.
export default (message: string, error?: unknown): void =>
  console.error(`[${new Date().toISOString()}] ${message}`, error);
