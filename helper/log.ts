// Helper: Log messages with timestamp.
export default (...messages: any[]): void => {
  messages.forEach((message) => {
    console.log(`[${new Date().toISOString()}] ${message}`);
  });
};
