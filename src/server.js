const { port } = require('./config/env');
const telemetry = require('./telemetry')
const app = require('./app');
const { pingDb } = require('./config/db');


async function start() {
  await pingDb()
  const server = app.listen(port, '0.0.0.0', () => console.log(`TripaHolidays Express API listening on port ${port}`));
  const shutdown = (signal) => {
    console.log(`${signal} received; shutting down gracefully.`);
    server.close(async () => {
      await telemetry.shutdown();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}
start().catch(err => { console.error('API startup failed:', err.message); process.exit(1); });
