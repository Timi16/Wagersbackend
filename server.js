import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

// Import Sequelize instance and routes
import sequelize from './config/database.js'; // Assuming models/index.js exports sequelize
import webhookRouter from './routes/webhook.js';
import authRoutes from './routes/authRoutes.js';
import wagerRoutes from './routes/wagers.js';
import adminRoutes from './routes/admin.js';
import './models/associations.js'; // Ensure associations are loaded
import paymentRoutes from './routes/paymentRoutes.js';
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// --- Middleware ---
app.use(helmet());
app.use(morgan('dev'));
app.use(cors());

// --- Body Parsers ---
// The `express.json` middleware with the `verify` option MUST be placed before your routes
// to ensure the raw body is captured before it's processed by the webhook handler.
app.use(express.json({
  verify: (req, res, buf, encoding) => {
    if (req.originalUrl.startsWith('/api/webhook/paystack')) {
      req.rawBody = buf.toString(encoding || 'utf8');
    }
  },
}));
app.use(express.urlencoded({ extended: true }));

// --- API Routes ---
app.use('/api/webhook/paystack', webhookRouter);
app.use('/api/auth', authRoutes);
app.use('/api/wagers', wagerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payment', paymentRoutes);
// --- Root Route for Health Check ---
app.get('/', (req, res) => {
  res.send('Welcome to WagersMe API');
});

// --- Server & DB Initialization ---
const startServer = async () => {
  try {
    await sequelize.sync({ alter: true });
    console.log('Database connected and synced successfully.');
    
    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();