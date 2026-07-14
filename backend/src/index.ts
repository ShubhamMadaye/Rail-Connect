import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { rateLimit } from 'express-rate-limit';
import { runBackup } from './utils/backup';
import authRoutes from './routes/auth';
import trainRoutes from './routes/trains';
import bookingRoutes from './routes/bookings';
import timetableRoutes from './routes/timetable';
import foodRoutes from './routes/food';
import adminRoutes from './routes/admin';
import assistantRoutes from './routes/assistant';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(helmet());

// HTTPS redirection in production
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production' && req.headers['x-forwarded-proto'] !== 'https') {
    return res.redirect(`https://${req.headers.host}${req.url}`);
  }
  next();
});

// General API rate limiting
const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100,
  message: { error: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api', apiRateLimiter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Railway API is running', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/trains', trainRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/timetable', timetableRoutes);
app.use('/api/food', foodRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/assistant', assistantRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error', message: 'Something went wrong on the server' });
});

app.listen(PORT, () => {
  console.log(`Railway API running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);

  // Start daily backups scheduler (every 24 hours)
  setInterval(() => {
    console.log('[SCHEDULER] Triggering scheduled database backup...');
    runBackup();
  }, 24 * 60 * 60 * 1000);
});

export default app;
