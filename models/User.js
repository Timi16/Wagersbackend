import { DataTypes, Model } from 'sequelize';
import bcrypt from 'bcrypt';
import sequelize from '../config/database.js';

class User extends Model {
  async validPassword(password) {
    return bcrypt.compare(password, this.password);
  }
}

User.init({
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      len: [3, 25],
    },
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
    },
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  role: {
    type: DataTypes.ENUM('user', 'admin'),
    defaultValue: 'user',
  },
  balance: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0.00,
    allowNull: false,
  },
  virtualAccountNumber: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  virtualAccountBank: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  virtualAccountName: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  paystackCustomerCode: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  totalBets: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  totalWins: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  totalAmount: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0.00,
  },
}, {
  sequelize,
  modelName: 'User',
  tableName: 'users',
  hooks: {
    beforeCreate: async (user) => {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(user.password, salt);
    }
  },
  getterMethods: {
    winRate() {
      return this.totalBets > 0 ? (this.totalWins / this.totalBets * 100).toFixed(2) : 0;
    }
  }
});

export default User;