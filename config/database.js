import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const sequelize = new Sequelize(process.env.NEON_DB, {
  dialect: 'postgres',
  protocol: 'postgres',
  logging: false,
});

export default sequelize;
