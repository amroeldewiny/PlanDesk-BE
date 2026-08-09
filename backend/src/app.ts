import cors from 'cors';
import express, {
  type NextFunction,
  type Request,
  type Response,
} from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

import { AppError } from './common/errors/app-error.js';
import { prisma } from './config/database.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { customerRouter } from './modules/customer/customer.routes.js';
import { employeeRouter } from './modules/employee/employee.routes.js';
import { planningRouter } from './modules/planning/planning.routes.js';
import { workOrderRouter } from './modules/work-order/work-order.routes.js';
import { dashboardRouter } from './modules/dashboard/dashboard.routes.js';

export const app = express();

/**
 * CORS runs before rate limiting and routes so browser preflight
 * requests always receive the correct access-control headers.
 */
app.use(
  cors({
    origin: process.env.CLIENT_URL ?? 'http://localhost:4200',
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

app.use(helmet());

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: process.env.NODE_ENV === 'production' ? 100 : 1000,
    standardHeaders: 'draft-8',
    legacyHeaders: false,

    // Browser preflight requests should not consume the API limit.
    skip: (request) => request.method === 'OPTIONS',

    message: {
      success: false,
      message: 'Too many requests. Please try again later.',
    },
  }),
);

app.use(express.json({ limit: '100kb' }));

app.use('/api/auth', authRouter);
app.use('/api/customers', customerRouter);
app.use('/api/employees', employeeRouter);
app.use('/api/work-orders', workOrderRouter);
app.use('/api/planning', planningRouter);
app.use('/api/dashboard', dashboardRouter);

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