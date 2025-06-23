import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

class Commission extends Model {}

Commission.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  wagerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'wagers',
      key: 'id',
    },
  },
  amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
  },
  transferred: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  transferredAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  sequelize,
  modelName: 'Commission',
  tableName: 'commissions',
  timestamps: true,
});

export default Commission;