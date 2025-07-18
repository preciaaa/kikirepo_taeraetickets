// RECAPCHA
const express = require('express');
const axios = require('axios'); // Import axios for HTTP requests
const router = express.Router();

// Verify reCAPTCHA token
router.post('/verify-recaptcha', async (req, res) => {
	try {
		const { token } = req.body; // Expect the reCAPTCHA token in the request body
		const secretKey = process.env.RECAPTCHA_SECRET_KEY; // Your reCAPTCHA secret key from environment variables

		// Send verification request to Google's reCAPTCHA API
		const response = await axios.post(
			`https://www.google.com/recaptcha/api/siteverify`,
			null,
			{
				params: {
					secret: secretKey,
					response: token,
				},
			}
		);

		const { success, score } = response.data;

		if (!success || score < 0.5) {
			// If verification fails or score is too low
			return res.status(400).json({ error: 'reCAPTCHA verification failed' });
		}

		// Verification successful
		res.status(200).json({ message: 'reCAPTCHA verified successfully' });
	} catch (err) {
		console.error('Error verifying reCAPTCHA:', err.message);
		res.status(500).json({ error: 'Internal server error' });
	}
});

module.exports = router;