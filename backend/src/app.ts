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
import { dashboardRouter } from './modules/dashboard/dashboard.routes.js';
import { employeeRouter } from './modules/employee/employee.routes.js';
import { planningRouter } from './modules/planning/planning.routes.js';
import { workOrderRouter } from './modules/work-order/work-order.routes.js';

/**
 * Configures the PlanDesk Express application.
 *
 * The HTTP server is started separately in server.ts. Keeping application
 * configuration separate makes the API easier to test.
 */
export const app = express();

/**
 * CORS must run before rate limiting and API routes so browser preflight
 * requests always receive the required access-control headers.
 */
app.use(
  cors({
    origin:
      process.env.CLIENT_URL ??
      'http://localhost:4200',
    methods: [
      'GET',
      'POST',
      'PATCH',
      'DELETE',
      'OPTIONS',
    ],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
    ],
  }),
);

/**
 * Adds standard HTTP security headers.
 */
app.use(helmet());

/**
 * Protects the API against excessive requests.
 *
 * Development receives a higher limit to support local testing.
 * OPTIONS requests are excluded because browser preflight requests
 * should not consume the application request limit.
 */
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit:
      process.env.NODE_ENV === 'production'
        ? 100
        : 1000,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skip: (request) =>
      request.method === 'OPTIONS',
    message: {
      success: false,
      message:
        'Too many requests. Please try again later.',
    },
  }),
);

/**
 * Parses JSON request bodies and limits their maximum size.
 * The limit reduces the risk of unnecessarily large payloads.
 */
app.use(express.json({ limit: '100kb' }));

/**
 * Registers application API modules.
 *
 * Authentication and company authorization are handled inside
 * the protected module routers.
 */
app.use('/api/auth', authRouter);
app.use('/api/customers', customerRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/employees', employeeRouter);
app.use('/api/planning', planningRouter);
app.use('/api/work-orders', workOrderRouter);

/**
 * Reports whether both the API and PostgreSQL database are available.
 * Deployment platforms can use this endpoint for health monitoring.
 */
app.get(
  '/api/health',
  async (
    _request: Request,
    response: Response,
  ) => {
    try {
      await prisma.$queryRaw`SELECT 1`;

      response.status(200).json({
        success: true,
        message:
          'PlanDesk BE API and database are running',
        database: 'connected',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error(
        'Database health check failed:',
        error,
      );

      response.status(503).json({
        success: false,
        message:
          'API is running, but the database is unavailable',
        database: 'disconnected',
        timestamp: new Date().toISOString(),
      });
    }
  },
);

/**
 * Handles requests that do not match a registered API route.
 * This middleware must remain after all valid routes.
 */
app.use(
  (
    _request: Request,
    response: Response,
  ) => {
    response.status(404).json({
      success: false,
      message: 'Route not found',
    });
  },
);

/**
 * Converts application errors into consistent JSON responses.
 *
 * Known AppError instances expose safe messages to the client.
 * Unexpected errors are logged internally without exposing
 * sensitive implementation details.
 */
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