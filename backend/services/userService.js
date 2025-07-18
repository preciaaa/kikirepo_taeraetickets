// This file is deprecated. Use Supabase Auth (auth.users) for all user management.
// All endpoints below are deprecated and should not be used.

// USER DB
const express = require('express');
const connectToSupabase = require('../db/supabase');
const supabase = connectToSupabase();
const router = express.Router()

// GET all users
router.get('/users', async (req, res) => {
	try {
		const { data, error } = await supabase.from('users').select('*');
		if (error) throw error;
		res.status(200).json(data);
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

// GET a user by ID
router.get('/users/:id', async (req, res) => {
    try {
        const { data, error } = await supabase.from('users').select('*').eq('id', req.params.id).single();
        if (error) throw error;
        res.status(200).json(data);
    } catch (err) {
        res.status(404).json({ error: err.message || 'User not found' });
    }
});

// Create a user with Supabase authentication
router.post('/users', async (req, res) => {
	try {
		const { email, password } = req.body; // Expect email and password in the request body
		const { data, error } = await supabase.auth.signUp({ email, password });
		if (error) throw error;

        // Insert into users table if not already present
        const userId = data.user?.id;
        if (userId) {
            const { count } = await supabase.from('users').select('id', { count: 'exact', head: true }).eq('id', userId);
            if (!count) {
                await supabase.from('users').insert({ id: userId, username: email });
            }
        }

		res.status(201).json(data); // Return the authentication data
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

// UPDATE a user by ID
router.put('/users/:id', async (req, res) => {
	try {
		const { data, error } = await supabase.from('users').update(req.body).eq('id', req.params.id);
		if (error) throw error;
		res.status(200).json(data);
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

// UPDATE user face_embedding by ID
router.put('/users/:id/face_embedding', async (req, res) => {
	try {
        const { face_embedding } = req.body
		const { data, error } = await supabase.from('users').update({ face_embedding }).eq('id', req.params.id);
		if (error) throw error;
		res.status(200).json(data);
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

// UPDATE user verification status by ID
router.put('/users/:id/verification', async (req, res) => {
	try {
        const { verified } = req.body;
		const { data, error } = await supabase.from('users').update({ verified }).eq('id', req.params.id);
		if (error) throw error;
		res.status(200).json(data);
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

router.get('/users/:id/verification', async (req, res) => {
	const userId = req.params.id
  
	try {
	  const { data: user, error } = await supabase
		.from('users')
		.select('verified')
		.eq('id', userId)
		.single()
  
	  if (error) {
		console.error('Supabase error:', error)
		return res.status(500).json({ message: 'Supabase error' })
	  }
  
	  if (!user) {
		return res.status(404).json({ message: 'User not found' })
	  }
  
	  return res.json({ verified: user.verified })
	} catch (err) {
	  console.error('Server error:', err)
	  res.status(500).json({ message: 'Server error' })
	}
  })
  

// DELETE a user by ID
router.delete('/users/:id', async (req, res) => {
	try {
		const { data, error } = await supabase.from('users').delete().eq('id', req.params.id);
		if (error) throw error;
		res.status(204).send();
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

module.exports = router