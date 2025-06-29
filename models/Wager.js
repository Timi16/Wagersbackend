// models/Wager.js
import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

class Wager extends Model {}

Wager.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [5, 200],
    },
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      len: [10, 1000],
    },
  },
  category: {
    type: DataTypes.ENUM(
      'sports', 'politics', 'entertainment', 'crypto', 
      'tech', 'weather', 'finance', 'other'
    ),
    allowNull: false,
  },
  deadline: {
    type: DataTypes.DATE,
    allowNull: false,
    validate: {
      isAfter: new Date().toISOString(),
    },
  },
  tags: {
    type: DataTypes.JSON,
    defaultValue: [],
  },
  stakeType: {
    type: DataTypes.ENUM('fixed', 'open'),
    allowNull: false,
    defaultValue: 'fixed',
  },
  fixedStake: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    validate: {
      min: 0.01,
    },
  },
  minStake: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    validate: {
      min: 0.01,
    },
  },
  maxStake: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  totalPool: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0.00,
  },
  participantCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  yesCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  noCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  totalYesStake: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0.00,
  },
  totalNoStake: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0.00,
  },
  status: {
    type: DataTypes.ENUM('active', 'closed', 'resolved', 'cancelled'),
    defaultValue: 'active',
  },
  result: {
    type: DataTypes.ENUM('yes', 'no', 'cancelled'),
    allowNull: true,
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  resolvedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  sequelize,
  modelName: 'Wager',
  tableName: 'wagers',
  timestamps: true,
  indexes: [
    {
      fields: ['category'],
    },
    {
      fields: ['status'],
    },
    {
      fields: ['deadline'],
    },
    {
      fields: ['createdBy'],
    },
  ],
});

export default Wager;