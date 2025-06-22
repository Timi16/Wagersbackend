// models/associations.js
import User from './User.js';
import Wager from './Wager.js';

// Define associations
User.hasMany(Wager, { 
  foreignKey: 'createdBy', 
  as: 'createdWagers' 
});

Wager.belongsTo(User, { 
  foreignKey: 'createdBy', 
  as: 'creator' 
});

export { User, Wager };