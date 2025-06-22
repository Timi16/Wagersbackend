// models/associations.js
import User from './User.js';
import Wager from './Wager.js';
import Bet from './Bet.js'; // Add this

// Existing associations
User.hasMany(Wager, { foreignKey: 'createdBy', as: 'createdWagers' });
Wager.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

// New associations
Wager.hasMany(Bet, { foreignKey: 'wagerId', as: 'bets' });
User.hasMany(Bet, { foreignKey: 'userId', as: 'bets' });
Bet.belongsTo(Wager, { foreignKey: 'wagerId', as: 'wager' });
Bet.belongsTo(User, { foreignKey: 'userId', as: 'user' });

export { User, Wager, Bet };