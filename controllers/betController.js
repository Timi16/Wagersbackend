import Bet from '../models/Bet.js';
import Wager from '../models/Wager.js';
import User from '../models/User.js';

export const placeBet = async (req, res) => {
  const { wagerId, choice, stake } = req.body;
  const userId = req.user.id;

  // Validate inputs
  if (!wagerId || !choice || !stake) {
    return res.status(400).json({ message: 'Missing required fields' });
  }
  if (!['yes', 'no'].includes(choice)) {
    return res.status(400).json({ message: 'Invalid choice' });
  }
  if (isNaN(stake) || stake <= 0) {
    return res.status(400).json({ message: 'Invalid stake amount' });
  }

  try {
    const wager = await Wager.findByPk(wagerId);
    if (!wager) {
      return res.status(404).json({ message: 'Wager not found' });
    }
    if (wager.status !== 'active') {
      return res.status(400).json({ message: 'Wager is not active' });
    }
    if (new Date() >= new Date(wager.deadline)) {
      return res.status(400).json({ message: 'Wager deadline has passed' });
    }

    // Validate stake based on stakeType
    if (wager.stakeType === 'fixed' && Number(stake) !== Number(wager.fixedStake)) {
      return res.status(400).json({ message: `Stake must be exactly ${wager.fixedStake}` });
    }
    if (wager.stakeType === 'open' && (stake < wager.minStake || stake > wager.maxStake)) {
      return res.status(400).json({ message: `Stake must be between ${wager.minStake} and ${wager.maxStake}` });
    }

    // Check user's balance
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (user.balance < stake) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    // Deduct stake from user's balance
    await user.decrement('balance', { by: stake });

    // Create the bet
    const bet = await Bet.create({
      userId,
      wagerId,
      choice,
      stake,
    });

    // Update wager stats
    await wager.increment('participantCount', { by: 1 });
    await wager.increment('totalPool', { by: stake });
    if (choice === 'yes') {
      await wager.increment('yesCount', { by: 1 });
    } else {
      await wager.increment('noCount', { by: 1 });
    }

    return res.status(201).json({ message: 'Bet placed successfully', bet });
  } catch (err) {
    console.error('Place bet error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};