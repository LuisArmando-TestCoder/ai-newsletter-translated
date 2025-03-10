// Helper: Log messages with timestamp.
export default (message: string): void =>
  console.log(`[${new Date().toISOString()}] ${message}`);
