import cors from 'cors';
import express, {
  type NextFunction,
  type Request,
  type Response,
} from 'express';

export const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL ?? 'http://localhost:4200',
  }),
);

app.use(express.json());

app.get('/api/health', (_request: Request, response: Response) => {
  response.status(200).json({
    success: true,
    message: 'PlanDesk BE API is running',
    timestamp: new Date().toISOString(),
  });
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