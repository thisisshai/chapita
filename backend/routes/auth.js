const express = require('express');
const router = express.Router();
const supabase = require('../supabase');

// Register a new business
router.post('/register', async (req, res) => {
  const { name, email, password, reward_name, brand_colour } = req.body;

  if (!name || !email || !password || !reward_name) {
    return res.status(400).json({ 
      error: 'Name, email, password and reward name are required' 
    });
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name, reward_name, brand_colour }
    }
  });

  if (error) return res.status(400).json({ error: error.message });

  res.status(201).json({
    message: 'Business registered successfully',
    user: data.user
  });
});

// Login an existing business
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) return res.status(400).json({ error: error.message });

  res.json({
    message: 'Login successful',
    session: data.session,
    user: data.user
  });
});

module.exports = router;