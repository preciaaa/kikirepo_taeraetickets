const express = require('express');
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const sharp = require('sharp');
const FormData = require('form-data');
const { parseTicketText } = require('../utils/parser');
const { generateFingerprint } = require('../utils/fingerprint');
const pdf = require('pdf-parse');

const router = express.Router();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = router; // LISTINGS DB
const connectToSupabase = require('../db/supabase');

const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype.startsWith('image/') ||
      file.mimetype === 'application/pdf' ||
      file.mimetype === 'application/octet-stream'
    ) {
      cb(null, true);
    } else {
      cb(new Error('Only image files or PDFs are allowed'), false);
    }
  }
});

// TICKETS

// GET single ticket by ticket_id
router.get('/tickets/:ticket_id', async (req, res) => {
  try {
      const { ticket_id } = req.params;
      const { data, error } = await supabase
          .from('listings')
          .select('*')
          .eq('ticket_id', ticket_id)
          .single();

      if (error) throw error;
      res.status(200).json(data);
  } catch (err) {
      res.status(404).json({ error: err.message || 'Ticket not found' });
  }
});

// UPDATE single ticket by ticket_id
router.put('/tickets/:ticket_id', async (req, res) => {
  try {
      const { ticket_id } = req.params;
      const updateFields = req.body;

      const { data, error } = await supabase
          .from('listings')
          .update({
              ...updateFields,
              updated_at: new Date().toISOString()
          })
          .eq('ticket_id', ticket_id)
          .select()
          .single();

      if (error) throw error;
      res.status(200).json(data);
  } catch (err) {
      res.status(400).json({ error: err.message || 'Failed to update ticket' });
  }
});

// DELETE single ticket by ticket_id
router.delete('/tickets/:ticket_id', async (req, res) => {
  try {
      const { ticket_id } = req.params;
      const { userId } = req.body;

      // Verify ownership
      const { data: ticket, error: fetchError } = await supabase
          .from('listings')
          .select('*')
          .eq('ticket_id', ticket_id)
          .eq('original_owner_id', userId)
          .single();

      if (fetchError || !ticket) {
          return res.status(404).json({ error: 'Ticket not found or unauthorized' });
      }

      const { error: deleteError } = await supabase
          .from('listings')
          .delete()
          .eq('ticket_id', ticket_id);

      if (deleteError) throw deleteError;
      res.json({ success: true });
  } catch (err) {
      res.status(500).json({ error: err.message });
  }
});


// LISTINGS

// GET all listings
router.get('/listings/all', async (req, res) => {
	try {
		const { data, error } = await supabase.from('listings').select('*');
		if (error) throw error;
		res.status(200).json(data);
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

router.get('/listings/:listings_id', async (req, res) => {
  try {
      const { listings_id } = req.params;
      const { data: tickets, error } = await supabase
          .from('listings')
          .select('*')
          .eq('listings_id', listings_id)
          .order('seat_number', { ascending: true });

      if (error) throw error;
      
      // Calculate summary info
      const totalPrice = tickets.reduce((sum, ticket) => sum + (ticket.price || 0), 0);
      const sections = [...new Set(tickets.map(t => t.section).filter(Boolean))];
      
      res.status(200).json({
          listings_id,
          tickets,
          summary: {
              totalPrice,
              ticketCount: tickets.length,
              sections,
              venue: tickets[0]?.venue,
              event_name: tickets[0]?.event_name,
              date: tickets[0]?.date
          }
      });
  } catch (err) {
      res.status(500).json({ error: err.message });
  }
});

// UPDATE all tickets in a listing (bulk update)
router.put('/listings/:listings_id', async (req, res) => {
  try {
      const { listings_id } = req.params;
      const updateFields = req.body;

      const { data, error } = await supabase
          .from('listings')
          .update({
              ...updateFields,
              updated_at: new Date().toISOString()
          })
          .eq('listings_id', listings_id)
          .select();

      if (error) throw error;
      res.status(200).json(data);
  } catch (err) {
      res.status(400).json({ error: err.message || 'Failed to update listing' });
  }
});

// DELETE entire listing (all tickets)
router.delete('/listings/:listings_id', async (req, res) => {
  try {
      const { listings_id } = req.params;
      const { userId } = req.body;

      // Verify ownership of at least one ticket in the listing
      const { data: tickets, error: fetchError } = await supabase
          .from('listings')
          .select('*')
          .eq('listings_id', listings_id)
          .eq('original_owner_id', userId);

      if (fetchError || !tickets || tickets.length === 0) {
          return res.status(404).json({ error: 'Listing not found or unauthorized' });
      }

      // Delete all tickets in the listing
      const { error: deleteError } = await supabase
          .from('listings')
          .delete()
          .eq('listings_id', listings_id);

      if (deleteError) throw deleteError;

      // Clean up storage files
      for (const ticket of tickets) {
          if (ticket.image_url) {
              const fileName = ticket.image_url.split('/').pop();
              if (fileName) {
                  await supabase.storage
                      .from('tickets')
                      .remove([fileName]);
              }
          }
      }

      res.json({ success: true, deletedCount: tickets.length });
  } catch (err) {
      res.status(500).json({ error: err.message });
  }
});

router.put('/tickets/:ticket_id/move-to-listing', async (req, res) => {
  try {
      const { ticket_id } = req.params;
      const { new_listings_id, userId } = req.body;

      // Verify ownership
      const { data: ticket, error: fetchError } = await supabase
          .from('listings')
          .select('*')
          .eq('ticket_id', ticket_id)
          .eq('original_owner_id', userId)
          .single();

      if (fetchError || !ticket) {
          return res.status(404).json({ error: 'Ticket not found or unauthorized' });
      }

      const { data, error } = await supabase
          .from('listings')
          .update({
              listings_id: new_listings_id,
              updated_at: new Date().toISOString()
          })
          .eq('ticket_id', ticket_id)
          .select()
          .single();

      if (error) throw error;
      res.status(200).json(data);
  } catch (err) {
      res.status(400).json({ error: err.message || 'Failed to move ticket' });
  }
});

router.get('/listings/:listings_id/summary', async (req, res) => {
  try {
      const { listings_id } = req.params;
      
      const { data: tickets, error } = await supabase
          .from('listings')
          .select('price, section, venue, event_name, date, status')
          .eq('listings_id', listings_id);

      if (error) throw error;
      
      const totalPrice = tickets.reduce((sum, ticket) => sum + (ticket.price || 0), 0);
      const sections = [...new Set(tickets.map(t => t.section).filter(Boolean))];
      const activeCount = tickets.filter(t => t.status === 'active').length;
      
      res.status(200).json({
          listings_id,
          totalPrice,
          ticketCount: tickets.length,
          activeTicketCount: activeCount,
          sections,
          venue: tickets[0]?.venue,
          event_name: tickets[0]?.event_name,
          date: tickets[0]?.date
      });
  } catch (err) {
      res.status(500).json({ error: err.message });
  }
});

// GET listings for a given event ID
router.get('/listings/getEventListings/:event_id', async (req, res) => {
	try {
		const { data, error } = await supabase
			.from('listings')
			.select('*')
			.eq('event_id', req.params.event_id);
		if (error) throw error;
		res.status(200).json(data);
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

// GET user's listings
router.get('/listings/getUserListings/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const { data: listings, error } = await supabase
      .from('listings')
      .select('*')
      .eq('original_owner_id', userId)
      .order('date', { ascending: false });

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    res.json({ listings });
  } catch (error) {
    console.error('Get listings error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch listings',
      details: error.message 
    });
  }
});


// POST processed ticket details 
router.post('/process-ticket', upload.single('ticket'), async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const isPdf = req.file.mimetype === 'application/pdf';
    let embedding = null;
    let publicUrl = null;
    let uploadBuffer = req.file.buffer;
    let fileName;
    let phash = null; 

    if (!isPdf) {
      const dedupFormData = new FormData();
      dedupFormData.append('image', Buffer.from(uploadBuffer), {
        filename: req.file.originalname,
        contentType: req.file.mimetype
      });
      const fastapiBaseUrl = process.env.NEXT_PUBLIC_FASTAPI_BACKEND_API_URL || 'http://localhost:5002';
      const dedupResponse = await axios.post(`${fastapiBaseUrl}/check-duplicate`, dedupFormData, {
        headers: dedupFormData.getHeaders(),
      });
      embedding = dedupResponse.data.embedding;
      phash = dedupResponse.data.phash;

      const { data: similarListings, error: matchError } = await supabase.rpc('match_embedding', {
        query_embedding: embedding,
        match_threshold: 0.5,
        match_count: 1
      });
      if (matchError) {
        console.error('Error querying for similar embeddings:', matchError);
      }
      if (similarListings && similarListings.length > 0) {
        return res.status(409).json({ error: 'Duplicate ticket image detected (DB check). Listing not created.' });
      }

      const optimizedBuffer = await sharp(uploadBuffer)
        .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer();
      fileName = `${uuidv4()}.jpg`;
      
      console.log('Attempting to upload image:', fileName);
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('tickets')
        .upload(fileName, optimizedBuffer, {
          contentType: 'image/jpeg',
          cacheControl: '3600'
        });
      
      if (uploadError) {
        console.error('Storage upload error details:', uploadError);
        throw new Error(`Storage upload failed: ${uploadError.message}`);
      }
      
      console.log('Image upload successful:', uploadData);
      publicUrl = supabase.storage
        .from('tickets')
        .getPublicUrl(fileName).data.publicUrl;
      // Save phash for image
    } else {
      fileName = `${uuidv4()}.pdf`;
      // For PDFs, also get phash from deduplication service
      const dedupFormData = new FormData();
      dedupFormData.append('file', Buffer.from(uploadBuffer), {
        filename: req.file.originalname,
        contentType: req.file.mimetype
      });
      const fastapiBaseUrl = process.env.NEXT_PUBLIC_FASTAPI_BACKEND_API_URL || 'http://localhost:5002';
      const dedupResponse = await axios.post(`${fastapiBaseUrl}/check-duplicate`, dedupFormData, {
        headers: dedupFormData.getHeaders(),
      });
      phash = dedupResponse.data.phash;
      
      console.log('Attempting to upload PDF:', fileName);
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('tickets')
        .upload(fileName, uploadBuffer, {
          contentType: 'application/pdf',
          cacheControl: '3600'
        });
      
      if (uploadError) {
        console.error('Storage upload error details:', uploadError);
        throw new Error(`Storage upload failed: ${uploadError.message}`);
      }
      
      console.log('PDF upload successful:', uploadData);
      publicUrl = supabase.storage
        .from('tickets')
        .getPublicUrl(fileName).data.publicUrl;
      // Save phash for PDF
    }

    const formData = new FormData();
    formData.append('file', Buffer.from(uploadBuffer), {
      filename: req.file.originalname,
      contentType: req.file.mimetype
    });
    
    let extractedText = '';
    let isScanned = false;

    try {
      const ocrResponse = await axios.post(`${process.env.NEXT_PUBLIC_FASTAPI_BACKEND_API_URL}/extract-text/`, formData, {
        headers: {
          ...formData.getHeaders(),
        },
        timeout: 120000,
      });
      extractedText = ocrResponse.data.text;
      isScanned = ocrResponse.data.is_scanned || false;
      console.log('OCR Result:', extractedText);
      console.log('Is Scanned:', isScanned);
    } catch (ocrError) {
      console.error('OCR failed:', ocrError);
      // fallback defaults:
      extractedText = '';
      isScanned = false;
    }

    // Parse ticket text
    let parsedFields = {};
    if (isScanned || !extractedText || extractedText.trim() === '') {
      // For scanned PDFs or when no text is extracted, use default values
      parsedFields = {
        event_name: '',
        venue: '',
        date: '',
        section: '',
        row: '',
        seat: '',
        price: '',
        category: ''
      };
    } else {
      parsedFields = parseTicketText(extractedText);
    }
    
    console.log('Parsed fields:', parsedFields);
    
    // Handle event_id logic - check if event exists, create if not
    let eventId = null;
    let eventDate = null;
    
    // Parse the date string to a proper date format
    if (parsedFields.event_date) {
      try {
        // Handle formats like "wed_4_sep_2024,_8:00PM"
        const dateStr = parsedFields.event_date.replace(/,/g, '').replace(/\*\*/g, '');
        const dateMatch = dateStr.match(/(\w{3})_(\d{1,2})_(\w{3})_(\d{4})/);
        if (dateMatch) {
          const [_, dayName, day, month, year] = dateMatch;
          const monthMap = {
            'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
            'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
          };
          if (monthMap[month.toLowerCase()] !== undefined) {
            eventDate = new Date(parseInt(year), monthMap[month.toLowerCase()], parseInt(day));
          }
        } else {
          // Try standard date format
          eventDate = new Date(parsedFields.event_date);
        }
      } catch (error) {
        console.error('Error parsing date:', error);
      }
    }

    console.log('Parsed event date:', eventDate);
    
    if (parsedFields.event_name && parsedFields.event_name !== 'Scanned Ticket - Manual Entry Required') {
      // Check if event already exists
      const { data: existingEvent, error: eventCheckError } = await supabase
        .from('events')
        .select('id')
        .eq('title', parsedFields.event_name)
        .eq('venue', parsedFields.venue)
        .eq('dates', `{${eventDate ? eventDate.toISOString() : ''}}`) 
        .single();
      
      if (eventCheckError && eventCheckError.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error checking for existing event:', eventCheckError);
      }
      
      if (existingEvent) {
        eventId = existingEvent.id;
        console.log('Found existing event with ID:', eventId);
      } else {
        // Create new event
        const { data: newEvent, error: createEventError } = await supabase
          .from('events')
          .insert({
            title: parsedFields.event_name,
            venue: parsedFields.venue || '',
            dates: eventDate ? [eventDate.toISOString()] : null,
            description: `Event at ${parsedFields.venue || 'Unknown venue'}`
          })
          .select()
          .single();
        
        if (createEventError) {
          console.error('Error creating new event:', createEventError);
        } else {
          eventId = newEvent.id;
          console.log('Created new event with ID:', eventId);
        }
      }
    }
    
    const fingerprint = generateFingerprint(parsedFields);

    // After parsing fields and before creating the listing, force event_name to use the provided value
    let finalEventName = req.body.eventName || parsedFields.event_name || 'Unknown Event';
    parsedFields.event_name = finalEventName;

    const now = new Date().toISOString();

    const listingRecord = {
      ticket_id: uuidv4(),
      listings_id: uuidv4(), // or some logic if you want to group tickets
      event_id: eventId,
      original_owner_id: userId,
      event_name: parsedFields.event_name || 'Unknown Event',
      section: parsedFields.section || '',
      row: parsedFields.row || '',
      seat_number: parsedFields.seat || '',
      price: parsedFields.price ? parseFloat(parsedFields.price) : null,
      category: parsedFields.category || 'General',
      venue: parsedFields.venue || '',
      new_owner_id: null,
      status: 'pending',  // initial status
      date: eventDate,
      fixed_seating: !!(parsedFields.section && parsedFields.row && parsedFields.seat),
      image_url: publicUrl,
      parsed_fields: parsedFields,
      fingerprint: fingerprint,
      is_verified: false,
      verified_at: null,
      created_at: now,
      updated_at: now,
      embedding,
      phash,
    };

    const { data: inserted, error: insertError } = await supabase
      .from('listings')
      .insert([listingRecord])
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting listing:', insertError);
      return res.status(500).json({ error: 'Failed to save listing', details: insertError.message });
    }

    // Don't create listing here - just return the processed data
    res.json({
      success: true,
      parsed: parsedFields,
      fingerprint,
      imageUrl: publicUrl,
      isScanned: isScanned,
      extractedText: extractedText,
      // Include data needed for listing creation
      eventId: eventId,
      eventDate: eventDate,
      publicUrl: publicUrl,
      embedding: embedding,
      phash: phash
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      error: 'Failed to process ticket upload',
      details: error.message 
    });
  }
});

// Create listing without file upload (for manual creation)
router.post('/listings', async (req, res) => {
  try {
    const listingData = req.body;
    const tickets = listingData.tickets || [listingData]; // If one, wrap as array

    if (!listingData.event_id || !listingData.original_owner_id || !listingData.event_name) {
      return res.status(400).json({ error: 'Missing required fields: event_id, original_owner_id, event_name' });
    }

    const listings_id = uuidv4(); // Shared for all tickets in this listing
    const now = new Date().toISOString();

    const ticketsToInsert = tickets.map(ticket => ({
      ticket_id: uuidv4(),
      listings_id,
      event_id: ticket.event_id,
      original_owner_id: ticket.original_owner_id,
      event_name: ticket.event_name,
      section: ticket.section || '',
      row: ticket.row || null,
      seat_number: ticket.seat_number || null,
      price: ticket.price ? parseFloat(ticket.price) : null,
      category: ticket.category || 'General',
      venue: ticket.venue || '',
      new_owner_id: null,
      status: 'active',
      date: ticket.date || null,
      fixed_seating: !!(ticket.section && ticket.row && ticket.seat_number),
      image_url: ticket.image_url || null,
      parsed_fields: ticket.parsed_fields || {},
      fingerprint: ticket.fingerprint || null,
      is_verified: false,
      verified_at: null,
      created_at: now,
      updated_at: now,
      embedding: ticket.embedding || null,
      phash: ticket.phash || null
    }));

    const { data: inserted, error } = await supabase
      .from('listings')
      .insert(ticketsToInsert)
      .select();

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    res.json({
      success: true,
      listings_id: listings_id,
      tickets: inserted
    });

  } catch (error) {
    console.error('Create multi-ticket listing error:', error);
    res.status(500).json({ error: 'Failed to create listing', details: error.message });
  }
});

router.get('/listings/by-listing-id/:listings_id', async (req, res) => {
  try {
    const { listings_id } = req.params;
    const { data, error } = await supabase
      .from('listings')
      .select('*')
      .eq('listings_id', listings_id);

    if (error) throw error;
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// Confirm listing (mark as verified)
router.post('/confirm-listing/:listingId', async (req, res) => {
  try {
    const { listingId } = req.params;
    const { userId } = req.body;

    // Verify user owns the listing
    const { data: listing, error: fetchError } = await supabase
      .from('listings')
      .select('*')
      .eq('listings_id', listingId)
      .eq('original_owner_id', userId)
      .single();

    if (fetchError || !listing) {
      return res.status(404).json({ error: 'Listing not found or unauthorized' });
    }

    // Download the file (image or PDF) from Supabase Storage
    const fileUrl = listing.image_url;
    const fileResponse = await axios.get(fileUrl, { responseType: 'arraybuffer' });
    const fileBuffer = Buffer.from(fileResponse.data);
    const fileName = fileUrl.split('/').pop() || 'file';
    const fileMime = fileName.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg';

    // Send file to deduplication service
    const formData = new FormData();
    formData.append('file', fileBuffer, { filename: fileName, contentType: fileMime });
    const fastapiBaseUrl = process.env.NEXT_PUBLIC_FASTAPI_BACKEND_API_URL || 'http://localhost:5002';
    let dedupRes;
    try {
      dedupRes = await axios.post(`${fastapiBaseUrl}/check-duplicate`, formData, {
        headers: formData.getHeaders(),
      });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to check for duplicate', details: err.message });
    }
    const isDuplicate = dedupRes.data.is_duplicate;
    let updateFields = {};
    if (isDuplicate) {
      updateFields = {
        status: 'rejected',
        is_verified: null,
        verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    } else {
      updateFields = {
        status: 'active',
        is_verified: true,
        verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }

    // Update listing status
    const { data: updatedListing, error: updateError } = await supabase
      .from('listings')
      .update(updateFields)
      .eq('listings_id', listingId)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Update error: ${updateError.message}`);
    }

    res.json({
      success: true,
      listing: updatedListing,
      verification_status: isDuplicate ? 'rejected' : 'verified',
      message: isDuplicate
        ? 'This listing was rejected due to duplication.'
        : 'Listing verified and published successfully.'
    });    

  } catch (error) {
    console.error('Confirm listing error:', error);
    res.status(500).json({ 
      error: 'Failed to confirm listing',
      details: error.message 
    });
  }
});
