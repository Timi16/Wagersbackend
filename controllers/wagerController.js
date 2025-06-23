import Wager from '../models/Wager.js';
import User from '../models/User.js';
import Bet from '../models/Bet.js';
import Commission from '../models/Commission.js';
// Import Commission model if you have it, or remove the Commission.create call
// import Commission from '../models/Commission.js';
import { Op } from 'sequelize';

/**
 * Create a new wager
 */
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

  // Validation
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
      status: 'active', // Set wager to active by default
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

/**
 * Get all active wagers
 */
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

/**
 * Get single wager by ID
 */
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

    return res.status(200).json({ wager });
  } catch (err) {
    console.error('Get wager error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Update wager
 */
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

/**
 * Delete/Cancel wager
 */
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

/**
 * Get wagers by category
 */
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

/**
 * Resolve a wager and distribute winnings
 */
export const resolveWager = async (req, res) => {
  const { id } = req.params;
  const { result } = req.body; // 'yes', 'no', or 'cancelled'

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
    
    // FIXED: Check if user has admin role
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

    const totalPool = wager.totalPool;
    const commission = totalPool * 0.10; // 10% commission
    const distributablePool = totalPool - commission;

    // Pay commission to the resolving admin's balance
    const admin = await User.findByPk(req.user.id);
    if (admin) {
      await admin.increment('balance', { by: commission });
    }

    // FIXED: Only create Commission record if you have the model
    // Comment out or remove if you don't have a Commission model
    
    await Commission.create({
      wagerId: wager.id,
      amount: commission,
      userId: req.user.id, // Log which admin received it
    });
    

    const winningChoice = result;
    const winningBets = await Bet.findAll({
      where: {
        wagerId: id,
        choice: winningChoice,
      },
    });

    if (winningBets.length === 0) {
      return res.status(200).json({ message: 'Wager resolved with no winners' });
    }

    const totalWinningStake = winningBets.reduce((sum, bet) => sum + bet.stake, 0);

    for (const bet of winningBets) {
      const user = await User.findByPk(bet.userId);
      if (user) {
        const winnings = (bet.stake / totalWinningStake) * distributablePool;
        await user.increment('balance', { by: winnings });
      }
    }

    return res.status(200).json({ message: 'Wager resolved and winnings distributed' });
  } catch (err) {
    console.error('Resolve wager error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};