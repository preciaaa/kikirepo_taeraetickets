// AUTH DB
const express = require('express');
const connectToSupabase = require('../db/supabase');
const supabase = connectToSupabase();
const router = express.Router()

// GET a single user by ID in authentication database
router.get('/auth-users/:id', async (req, res) => {
    try {
        const { data, error } = await supabase.auth.admin.getUserById(req.params.id); // Supabase auth API

        if (error) {
            console.error("Error fetching user from authentication database:", error);
            throw error;
        }

        res.status(200).json(data);
    } catch (err) {
        res.status(404).json({ error: err.message || 'User not found' });
    }
});

// GET all users in authentication database
router.get('/auth-users', async (req, res) => {
    try {
        const { data, error } = await supabase.auth.admin.listUsers(); // Supabase auth API to list users
        if (error) throw error;
        res.status(200).json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// CREATE a user in authentication database
router.post('/auth-users', async (req, res) => {
    try {
        const { email, password } = req.body; // Expect email and password in the request body
        const { data, error } = await supabase.auth.admin.createUser({ email, password }); // Supabase auth API to create user
        if (error) throw error;
        res.status(201).json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// UPDATE a user in authentication database
router.put('/auth-users/:id', async (req, res) => {
    try {
        const { email, password } = req.body; // Expect email and/or password in the request body
        const { data, error } = await supabase.auth.admin.updateUserById(req.params.id, { email, password }); // Supabase auth API to update user
        if (error) throw error;
        res.status(200).json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE a user in authentication database
router.delete('/auth-users/:id', async (req, res) => {
    try {
        const { error } = await supabase.auth.admin.deleteUser(req.params.id); // Supabase auth API to delete user
        if (error) throw error;
        res.status(204).send();
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;