import express from 'express';
import dotenv from 'dotenv';
import sequelize from './config/database.js';
import authRoutes from './routes/authRoutes.js';

dotenv.config();
const app = express();

// middleware
app.use(express.json());

// mount routes
app.use('/api/auth', authRoutes);

// connect to database and then start server
const PORT = process.env.PORT || 3000;

sequelize.authenticate()
  .then(() => {
    console.log('Database connection established');
    return sequelize.sync({ alter: true });
  })
  .then(() => {
    console.log('Database synced');
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('Unable to start application:', err);
    process.exit(1);
  });
