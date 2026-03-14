import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';

import drugsRouter from './routes/drugs';
import patientsRouter from './routes/patients';
import medicationsRouter from './routes/medications';
import shareRouter from './routes/share';
import caregiversRouter from './routes/caregivers';
import authRouter from './routes/auth';
import { errorHandler } from './middleware/error';

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(morgan('dev'));
app.use(express.json());

// Public share route (no auth)
app.use('/share', shareRouter);

// Auth sync route
app.use('/api/auth', authRouter);

// Protected API routes
app.use('/api/drugs', drugsRouter);
app.use('/api/patients', patientsRouter);
app.use('/api/medications', medicationsRouter);
app.use('/api/caregivers', caregiversRouter);

app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`MedCard server running on http://localhost:${PORT}`);
});

export default app;
