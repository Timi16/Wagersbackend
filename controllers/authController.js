import User from '../models/User.js';

export const signup = async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(409).json({ message: 'Email already in use' });
    }
    const user = await User.create({ username, email, password });
    return res.status(201).json({ id: user.id, username: user.username, email: user.email });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
};