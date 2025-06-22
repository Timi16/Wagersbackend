import Wager from '../models/Wager.js';
import User from '../models/User.js';

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

  // Validate deadline is in the future
  const deadlineDate = new Date(deadline);
  if (deadlineDate <= new Date()) {
    return res.status(400).json({ 
      message: 'Deadline must be in the future' 
    });
  }

  // Validate stake type requirements
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

    });

    // Include creator information in response
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
    else where.status = 'active'; // Default to active wagers

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
 * Update wager (only by creator and before deadline)
 */
export const updateWager = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, tags } = req.body;

    const wager = await Wager.findByPk(id);
    if (!wager) {
      return res.status(404).json({ message: 'Wager not found' });
    }

    // Check if user is the creator
    if (wager.createdBy !== req.user.id) {
      return res.status(403).json({ message: 'Only the creator can update this wager' });
    }

    // Check if wager is still active and deadline hasn't passed
    if (wager.status !== 'active' || new Date() >= new Date(wager.deadline)) {
      return res.status(400).json({ message: 'Cannot update inactive or expired wager' });
    }

    // Update only allowed fields
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
 * Delete/Cancel wager (only by creator and if no participants)
 */
export const deleteWager = async (req, res) => {
  try {
    const { id } = req.params;

    const wager = await Wager.findByPk(id);
    if (!wager) {
      return res.status(404).json({ message: 'Wager not found' });
    }

    // Check if user is the creator
    if (wager.createdBy !== req.user.id) {
      return res.status(403).json({ message: 'Only the creator can delete this wager' });
    }

    // Check if there are participants
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