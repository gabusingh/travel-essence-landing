// Vercel Serverless Function to handle form submissions
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle OPTIONS request for CORS
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { name, propertyName, website, location, package: selectedPackage, message, email, captcha, captchaExpected } = req.body;

    // Validate required fields
    if (!name || !propertyName || !email) {
      return res.status(400).json({ error: 'Name, Email, and Property Name are required' });
    }

    // Verify Captcha on server-side
    if (captcha !== captchaExpected) {
      return res.status(400).json({ error: 'Invalid captcha. Please try again.' });
    }

    // Prepare data for Google Sheets
    const timestamp = new Date().toISOString();
    const formData = {
      timestamp,
      name,
      email: email || '',
      propertyName,
      website: website || '',
      location: location || '',
      package: selectedPackage || '',
      message: message || ''
    };

    // If Google Sheets API is configured or use provided SheetDB URL
    const sheetUrl = process.env.GOOGLE_SHEETS_URL || 'https://sheetdb.io/api/v1/onun5yeic9qew';
    
    if (sheetUrl) {
      await fetch(sheetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: [formData] })
      });
    }

    // Send email notification if configured
    if (process.env.NOTIFICATION_EMAIL && process.env.SENDGRID_API_KEY) {
      const sgMail = require('@sendgrid/mail');
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);

      const msg = {
        to: process.env.NOTIFICATION_EMAIL,
        from: process.env.FROM_EMAIL || process.env.NOTIFICATION_EMAIL,
        subject: `New Travel Essence Inquiry from ${name}`,
        html: `
          <h2>New Contact Form Submission</h2>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email || 'Not provided'}</p>
          <p><strong>Property/Brand:</strong> ${propertyName}</p>
          <p><strong>Website:</strong> ${website || 'Not provided'}</p>
          <p><strong>Location:</strong> ${location || 'Not provided'}</p>
          <p><strong>Package:</strong> ${selectedPackage || 'Not specified'}</p>
          <p><strong>Message:</strong></p>
          <p>${message || 'No message provided'}</p>
          <hr>
          <p><small>Submitted at: ${timestamp}</small></p>
        `
      };

      await sgMail.send(msg);
    }

    // Log to console for Vercel logs
    console.log('Form submission received:', formData);

    // Return success response
    return res.status(200).json({ 
      success: true, 
      message: 'Thank you! We will be in touch soon.' 
    });

  } catch (error) {
    console.error('Error processing form:', error);
    return res.status(500).json({ 
      error: 'Failed to submit form. Please try again or email us directly.' 
    });
  }
}
