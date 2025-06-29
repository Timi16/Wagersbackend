import Bet from '../models/Bet.js';
import Wager from '../models/Wager.js';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';

export const placeBet = async (req, res) => {
  const wagerId = req.params.id;
  const { choice, stake } = req.body;
  const userId = req.user.id;

  if (!choice || !stake) {
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

    if (wager.stakeType === 'fixed' && Number(stake) !== Number(wager.fixedStake)) {
      return res.status(400).json({ message: `Stake must be exactly ${wager.fixedStake}` });
    }
    if (wager.stakeType === 'open' && (stake < wager.minStake || stake > wager.maxStake)) {
      return res.status(400).json({ message: `Stake must be between ${wager.minStake} and ${wager.maxStake}` });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (user.balance < stake) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    await user.decrement('balance', { by: stake });

    const bet = await Bet.create({
      userId,
      wagerId,
      choice,
      stake,
    });

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

    await Transaction.create({
      userId: userId,
      type: 'bet',
      amount: -stake,
      status: 'completed',
      wagerId: wagerId,
      date: new Date(),
    });

    return res.status(201).json({ message: 'Bet placed successfully', bet });
  } catch (err) {
    console.error('Place bet error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};