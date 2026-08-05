import cors from 'cors';
import express, {
  type NextFunction,
  type Request,
  type Response,
} from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

import { prisma } from './config/database.js';
import { AppError } from './common/errors/app-error.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { customerRouter } from './modules/customer/customer.routes.js';

export const app = express();

app.use(helmet());

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
      success: false,
      message: 'Too many requests. Please try again later.',
    },
  }),
);

app.use(
  cors({
    origin: process.env.CLIENT_URL ?? 'http://localhost:4200',
  }),
);

app.use(express.json({ limit: '100kb' }));

app.use('/api/auth', authRouter);
app.use('/api/customers', customerRouter);

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
    if (error instanceof AppError) {
      response.status(error.statusCode).json({
        success: false,
        message: error.message,
        details: error.details,
      });

      return;
    }

    console.error(error);

    response.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  },
);
