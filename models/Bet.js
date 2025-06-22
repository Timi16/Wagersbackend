// models/Bet.js
import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

class Bet extends Model {}

Bet.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  wagerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'wagers',
      key: 'id',
    },
  },
  choice: {
    type: DataTypes.ENUM('yes', 'no'),
    allowNull: false,
  },
  stake: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0.01,
    },
  },
}, {
  sequelize,
  modelName: 'Bet',
  tableName: 'bets',
  timestamps: true,
});

export default Bet;