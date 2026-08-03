import cors from 'cors';
import express, {
  type NextFunction,
  type Request,
  type Response,
} from 'express';

import { prisma } from './config/database.js';

export const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL ?? 'http://localhost:4200',
  }),
);

app.use(express.json());

app.get('/api/health', async (_request: Request, response: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    response.status(200).json({
      success: true,
      message: 'PlanDesk BE API and database are running',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Database health check failed:', error);

    response.status(503).json({
      success: false,
      message: 'API is running, but the database is unavailable',
      database: 'disconnected',
      timestamp: new Date().toISOString(),
    });
  }
});

app.use((_request: Request, response: Response) => {
  response.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

app.use(
  (
    error: Error,
    _request: Request,
    response: Response,
    _next: NextFunction,
  ) => {
    console.error(error);

    response.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  },
);