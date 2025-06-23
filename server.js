import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import sequelize from './config/database.js';
import authRoutes from './routes/authRoutes.js';
import webhookRoutes from './routes/webhook.js';
import wagerRoutes from './routes/wagers.js';
import './models/associations.js'; // Import associations
import  adminRoutes from './routes/admin.js'
dotenv.config();
const app = express();

// middleware
app.use(cors());
app.use('/api/webhook', webhookRoutes);
app.use(express.json());

// sync database
sequelize.sync({ alter: true })
  .then(() => console.log('Database synced'))
  .catch((err) => console.error('DB sync error:', err));

// mount routes
app.use('/api/auth', authRoutes);
app.use('/api/wagers', wagerRoutes);
app.use('/api/admin', adminRoutes);
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));