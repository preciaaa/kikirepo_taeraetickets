// EVENTS DB
const express = require('express');
const connectToSupabase = require('../db/supabase');
const supabase = connectToSupabase();
const router = express.Router()

// GET all events
router.get('/events', async (req, res) => {
	try {
		const { data, error } = await supabase.from('events').select('*');
		if (error) throw error;
		res.status(200).json(data);
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

// GET event by id
router.get('/events/:id', async (req, res) => {
	try {
		const { data, error } = await supabase.from('events').select('*').select('*').eq('id', req.params.id).single();
		if (error) throw error;
		res.status(200).json(data);
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

// Create an event
router.post('/events/create', async (req, res) => {
	try {
		const { title, venue, img_url, description } = req.body;
		const { data, error } = await supabase
			.from('events')
			.insert([{ title, venue, img_url, description }])
		if (error) throw error;
		res.status(201).json(data); 
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

// Update event dates
router.post('/events/:id/add-date', async (req, res) => {
	try {
	  const { date } = req.body;
	  const { id } = req.params;
  
	  // Fetch existing dates for the event
	  const { data: existingEvent, error: fetchError } = await supabase
		.from('events')
		.select('dates')
		.eq('id', id)
		.single();
  
	  if (fetchError) throw fetchError;
	  if (!existingEvent) {
		return res.status(404).json({ error: 'Event not found' });
	  }
	  
	  const existingDates = existingEvent.dates || [];
  
	  // Prevent duplicate date
	  if (existingDates.includes(date)) {
		return res.status(200).json({ message: 'Date already exists', data: existingDates });
	  }
  
	  const updatedDates = [...existingDates, date];
  
	  // Update the event with the new dates array
	  const { data, error: updateError } = await supabase
		.from('events')
		.update({ dates: updatedDates })
		.eq('id', id);
  
	  if (updateError) throw updateError;
  
	  return res.status(200).json({ message: 'Event date added', data });
	} catch (err) {
	  console.error('Error updating event date:', err);
	  return res.status(500).json({ error: err.message || 'Server error' });
	}
  });  

module.exports = router