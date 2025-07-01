import Wager from '../models/Wager.js';
import User from '../models/User.js';
import Bet from '../models/Bet.js';
import Commission from '../models/Commission.js';
import { Op } from 'sequelize';

export const createWager = async (req, res) => {
  if (!req.body || typeof req.body !== 'object') {
    return res.status(400).json({ message: 'Invalid request body' });
  }

  const {
    title,
    description,
    category,
    deadline,
    tags,
    stakeType,
    fixedStake,
    minStake,
    maxStake,
  } = req.body;

  if (!title || !description || !category || !deadline) {
    return res.status(400).json({ 
      message: 'Required fields: title, description, category, deadline' 
    });
  }

  const deadlineDate = new Date(deadline);
  if (deadlineDate <= new Date()) {
    return res.status(400).json({ 
      message: 'Deadline must be in the future' 
    });
  }

  if (stakeType === 'fixed' && !fixedStake) {
    return res.status(400).json({ 
      message: 'Fixed stake amount is required for fixed stake type' 
    });
  }

  if (stakeType === 'open' && (!minStake || !maxStake)) {
    return res.status(400).json({ 
      message: 'Min and max stake amounts are required for open stake type' 
    });
  }

  if (stakeType === 'open' && minStake >= maxStake) {
    return res.status(400).json({ 
      message: 'Min stake must be less than max stake' 
    });
  }

  try {
    const wager = await Wager.create({
      title,
      description,
      category,
      deadline: deadlineDate,
      tags: tags || [],
      stakeType: stakeType || 'fixed',
      fixedStake: stakeType === 'fixed' ? fixedStake : null,
      minStake: stakeType === 'open' ? minStake : null,
      maxStake: stakeType === 'open' ? maxStake : null,
      createdBy: req.user.id,
      status: 'active',
    });

    const wagerWithCreator = await Wager.findByPk(wager.id, {
      include: [{
        model: User,
        as: 'creator',
        attributes: ['id', 'username'],
      }],
    });

    return res.status(201).json({
      message: 'Wager created successfully',
      wager: wagerWithCreator,
    });
  } catch (err) {
    console.error('Create wager error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const getWagers = async (req, res) => {
  try {
    const { category, status, page = 1, limit = 10 } = req.query;
    
    const where = {};
    if (category) where.category = category;
    if (status) where.status = status;
    else where.status = 'active';

    const offset = (page - 1) * limit;

    const { count, rows: wagers } = await Wager.findAndCountAll({
      where,
      include: [{
        model: User,
        as: 'creator',
        attributes: ['id', 'username'],
      }],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    return res.status(200).json({
      wagers,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit),
      },
    });
  } catch (err) {
    console.error('Get wagers error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const getWager = async (req, res) => {
  try {
    const { id } = req.params;

    const wager = await Wager.findByPk(id, {
      include: [{
        model: User,
        as: 'creator',
        attributes: ['id', 'username'],
      }],
    });

    if (!wager) {
      return res.status(404).json({ message: 'Wager not found' });
    }

    const commissionRate = 0.10;
    const distributablePool = wager.totalPool * (1 - commissionRate);

    // Calculate odds multipliers
    wager.dataValues.multiplierYes = wager.totalYesStake > 0 ? distributablePool / wager.totalYesStake : null;
    wager.dataValues.multiplierNo = wager.totalNoStake > 0 ? distributablePool / wager.totalNoStake : null;

    // Calculate predicted winnings for the authenticated user
    if (req.user) {
      const bet = await Bet.findOne({ where: { wagerId: id, userId: req.user.id } });
      if (bet) {
        const totalStakeOnChoice = bet.choice === 'yes' ? wager.totalYesStake : wager.totalNoStake;
        if (totalStakeOnChoice > 0) {
          const predictedWinnings = (bet.stake / totalStakeOnChoice) * distributablePool;
          wager.dataValues.predictedWinnings = Number(predictedWinnings.toFixed(2));
        } else {
          wager.dataValues.predictedWinnings = distributablePool; // If only one bettor on this side
        }
      }
    }

    return res.status(200).json({ wager });
  } catch (err) {
    console.error('Get wager error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const updateWager = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, tags } = req.body;

    const wager = await Wager.findByPk(id);
    if (!wager) {
      return res.status(404).json({ message: 'Wager not found' });
    }

    if (wager.createdBy !== req.user.id) {
      return res.status(403).json({ message: 'Only the creator can update this wager' });
    }

    if (wager.status !== 'active' || new Date() >= new Date(wager.deadline)) {
      return res.status(400).json({ message: 'Cannot update inactive or expired wager' });
    }

    const updates = {};
    if (title) updates.title = title;
    if (description) updates.description = description;
    if (tags) updates.tags = tags;

    await wager.update(updates);

    const updatedWager = await Wager.findByPk(id, {
      include: [{
        model: User,
        as: 'creator',
        attributes: ['id', 'username'],
      }],
    });

    return res.status(200).json({
      message: 'Wager updated successfully',
      wager: updatedWager,
    });
  } catch (err) {
    console.error('Update wager error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const deleteWager = async (req, res) => {
  try {
    const { id } = req.params;

    const wager = await Wager.findByPk(id);
    if (!wager) {
      return res.status(404).json({ message: 'Wager not found' });
    }

    if (wager.createdBy !== req.user.id) {
      return res.status(403).json({ message: 'Only the creator can delete this wager' });
    }

    if (wager.participantCount > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete wager with participants. Consider cancelling instead.' 
      });
    }

    await wager.destroy();

    return res.status(200).json({ message: 'Wager deleted successfully' });
  } catch (err) {
    console.error('Delete wager error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const getWagersByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const offset = (page - 1) * limit;

    const { count, rows: wagers } = await Wager.findAndCountAll({
      where: { 
        category, 
        status: 'active',
        deadline: {
          [Op.gt]: new Date(),
        },
      },
      include: [{
        model: User,
        as: 'creator',
        attributes: ['id', 'username'],
      }],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    return res.status(200).json({
      wagers,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit),
      },
    });
  } catch (err) {
    console.error('Get wagers by category error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const resolveWager = async (req, res) => {
  const { id } = req.params;
  const { result } = req.body;

  if (!['yes', 'no', 'cancelled'].includes(result)) {
    return res.status(400).json({ message: 'Invalid result' });
  }

  try {
    const wager = await Wager.findByPk(id);
    if (!wager) {
      return res.status(404).json({ message: 'Wager not found' });
    }
    if (wager.status !== 'active') {
      return res.status(400).json({ message: 'Wager is not active' });
    }
    
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only an admin can resolve this wager' });
    }

    wager.result = result;
    wager.status = 'resolved';
    wager.resolvedAt = new Date();
    await wager.save();

    if (result === 'cancelled') {
      const bets = await Bet.findAll({ where: { wagerId: id } });
      for (const bet of bets) {
        const user = await User.findByPk(bet.userId);
        if (user) {
          await user.increment('balance', { by: bet.stake });
        }
      }
      return res.status(200).json({ message: 'Wager cancelled and stakes refunded' });
    }

    // FIXED: Calculate total pool correctly from actual stakes
    const totalYesStake = parseFloat(wager.totalYesStake || 0);
    const totalNoStake = parseFloat(wager.totalNoStake || 0);
    const actualTotalPool = totalYesStake + totalNoStake;
    
    // Use actual total pool instead of stored totalPool (which might be wrong)
    const commission = actualTotalPool * 0.10;
    const distributablePool = actualTotalPool - commission;

    console.log('=== COMMISSION DEBUG ===');
    console.log('Total Yes Stake:', totalYesStake);
    console.log('Total No Stake:', totalNoStake);
    console.log('Actual Total Pool:', actualTotalPool);
    console.log('Stored Total Pool:', wager.totalPool);
    console.log('Commission (10%):', commission);
    console.log('Distributable Pool:', distributablePool);

    const admin = await User.findByPk(req.user.id);
    if (admin) {
      await admin.increment('balance', { by: commission });
    }

    await Commission.create({
      wagerId: wager.id,
      amount: commission,
      userId: req.user.id,
    });

    const winningBets = await Bet.findAll({
      where: {
        wagerId: id,
        choice: result,
      },
    });

    // Since there will always be winners, this should never happen
    if (winningBets.length === 0) {
      return res.status(200).json({ message: 'Wager resolved with no winners' });
    }

    const totalWinningStake = result === 'yes' ? totalYesStake : totalNoStake;

    for (const bet of winningBets) {
      const user = await User.findByPk(bet.userId);
      if (user) {
        const winnings = (parseFloat(bet.stake) / totalWinningStake) * distributablePool;
        await user.increment('balance', { by: winnings });
      }
    }

    return res.status(200).json({ 
      message: 'Wager resolved and winnings distributed',
      debug: {
        actualTotalPool,
        storedTotalPool: wager.totalPool,
        commission,
        distributablePool
      }
    });
  } catch (err) {
    console.error('Resolve wager error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};