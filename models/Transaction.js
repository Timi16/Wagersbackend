import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

class Transaction extends Model {}
Transaction.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  userId: { type: DataTypes.INTEGER, allowNull: false },
  type: { type: DataTypes.ENUM('deposit', 'withdraw', 'bet', 'win', 'loss'), allowNull: false },
  amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  status: { type: DataTypes.ENUM('completed', 'pending', 'failed'), defaultValue: 'completed' },
  date: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  method: { type: DataTypes.STRING },
  wagerId: { type: DataTypes.INTEGER },
}, { sequelize, modelName: 'Transaction' });

export default Transaction;