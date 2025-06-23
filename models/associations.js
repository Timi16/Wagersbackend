import User from './User.js';
import Wager from './Wager.js';
import Bet from './Bet.js';
import Commission from './Commission.js';

User.hasMany(Wager, { foreignKey: 'createdBy', as: 'createdWagers' });
Wager.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

Wager.hasMany(Bet, { foreignKey: 'wagerId', as: 'bets' });
User.hasMany(Bet, { foreignKey: 'userId', as: 'bets' });
Bet.belongsTo(Wager, { foreignKey: 'wagerId', as: 'wager' });
Bet.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Wager.hasMany(Commission, { foreignKey: 'wagerId', as: 'commissions' });
Commission.belongsTo(Wager, { foreignKey: 'wagerId', as: 'wager' });

export { User, Wager, Bet, Commission };