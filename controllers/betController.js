import Bet from '../models/Bet.js';
import Wager from '../models/Wager.js';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';

export const placeBet = async (req, res) => {
  const wagerId = req.params.id;
  const { choice, stake } = req.body;
  const userId = req.user.id;

  console.log('🎯 PLACE BET ENDPOINT HIT');
  console.log('   Wager ID:', wagerId);
  console.log('   User ID:', userId);
  console.log('   Request Body:', req.body);
  console.log('   Choice:', choice);
  console.log('   Stake:', stake);

  if (!choice || !stake) {
    console.log('❌ Missing required fields');
    return res.status(400).json({ message: 'Missing required fields' });
  }

  if (!['yes', 'no'].includes(choice)) {
    console.log('❌ Invalid choice');
    return res.status(400).json({ message: 'Invalid choice' });
  }
  
  if (isNaN(stake) || stake <= 0) {
    console.log('❌ Invalid stake amount');
    return res.status(400).json({ message: 'Invalid stake amount' });
  }

  try {
    const wager = await Wager.findByPk(wagerId);
    if (!wager) {
      console.log('❌ Wager not found');
      return res.status(404).json({ message: 'Wager not found' });
    }
    
    if (wager.status !== 'active') {
      console.log('❌ Wager is not active');
      return res.status(400).json({ message: 'Wager is not active' });
    }
    
    if (new Date() >= new Date(wager.deadline)) {
      console.log('❌ Wager deadline has passed');
      return res.status(400).json({ message: 'Wager deadline has passed' });
    }

    // Fixed: Added backticks for template literals
    if (wager.stakeType === 'fixed' && Number(stake) !== Number(wager.fixedStake)) {
      console.log('❌ Fixed stake amount mismatch');
      return res.status(400).json({ message: `Stake must be exactly ${wager.fixedStake}` });
    }
    
    if (wager.stakeType === 'open' && (stake < wager.minStake || stake > wager.maxStake)) {
      console.log('❌ Open stake amount out of range');
      return res.status(400).json({ message: `Stake must be between ${wager.minStake} and ${wager.maxStake}` });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      console.log('❌ User not found');
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (user.balance < stake) {
      console.log('❌ Insufficient balance');
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    // Start transaction
    console.log('💰 Deducting balance from user');
    await user.decrement('balance', { by: stake });

    console.log('🎲 Creating bet record');
    const bet = await Bet.create({
      userId,
      wagerId,
      choice,
      stake,
    });

    console.log('📊 Updating wager statistics');
    // Update wager stats in a single operation
    if (choice === 'yes') {
      await wager.increment({
        participantCount: 1,
        totalPool: stake,
        yesCount: 1,
        totalYesStake: stake,
      });
    } else {
      await wager.increment({
        participantCount: 1,
        totalPool: stake,
        noCount: 1,
        totalNoStake: stake,
      });
    }

    console.log('💳 Creating transaction record');
    await Transaction.create({
      userId: userId,
      type: 'bet',
      amount: -stake,
      status: 'completed',
      wagerId: wagerId,
      date: new Date(),
    });

    console.log('✅ Bet placed successfully');
    return res.status(201).json({ 
      message: 'Bet placed successfully', 
      bet,
      success: true 
    });
  } catch (err) {
    console.error('❌ Place bet error:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};