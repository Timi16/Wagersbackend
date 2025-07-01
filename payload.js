import Sequelize from 'sequelize';
import dotenv from 'dotenv';
dotenv.config();

// Initialize the Sequelize connection
const sequelize = new Sequelize('postgresql://neondb_owner:npg_IAYwHZxup4r5@ep-long-sun-a58u3lof-pooler.us-east-2.aws.neon.tech/neondb', {
  dialect: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false,
    }
  },
  logging: false,
});

// Define User model inline (you can also import if it's in a separate file)
import { DataTypes, Model } from 'sequelize';
import bcrypt from 'bcrypt';

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
    validate: { len: [3, 25] },
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: { isEmail: true },
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
  virtualAccountNumber: DataTypes.STRING,
  virtualAccountBank: DataTypes.STRING,
  virtualAccountName: DataTypes.STRING,
  paystackCustomerCode: DataTypes.STRING,
  bankAccountNumber: DataTypes.STRING,
  bankCode: DataTypes.STRING,
  paystackRecipientCode: DataTypes.STRING,
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
    },
  },
});

async function fetchUsers() {
  try {
    await sequelize.authenticate();
    console.log('Database connected.');

    await sequelize.sync(); // optional, only if you want to sync models

    const users = await User.findAll();

    console.log('All Users:', JSON.stringify(users, null, 2));
  } catch (error) {
    console.error('Error fetching users:', error);
  } finally {
    await sequelize.close();
  }
}

fetchUsers();
