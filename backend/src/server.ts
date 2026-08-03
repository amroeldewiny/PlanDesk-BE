import 'dotenv/config';

import { app } from './app.js';
import { prisma } from './config/database.js';

const port = Number(process.env.PORT) || 3000;

const server = app.listen(port, () => {
  console.log(`PlanDesk BE API running at http://localhost:${port}`);
});

const shutdown = (signal: string): void => {
  console.log(`\n${signal} received. Closing PlanDesk BE API...`);

  server.close(async () => {
    await prisma.$disconnect();
    console.log('API and database connections closed.');
    process.exit(0);
  });
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));