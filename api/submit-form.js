const sgMail = require('@sendgrid/mail');
const axios = require('axios');

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

    // 1. Save to Google Sheets via SheetDB
    // Forcing the new URL to bypass any old environment variables in Vercel
    const sheetUrl = 'https://sheetdb.io/api/v1/v9402em60pcmb';
    let sheetSuccess = false;
    let sheetErrorLog = null;
    
    if (sheetUrl) {
      try {
        const sheetResponse = await axios.post(sheetUrl, {
          data: [formData]
        }, {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          timeout: 5000 // 5 second timeout
        });
        
        if (sheetResponse.status >= 200 && sheetResponse.status < 300) {
          sheetSuccess = true;
          console.log('Successfully saved to Google Sheets via axios');
        } else {
          console.error('SheetDB Non-Success Status:', sheetResponse.status, sheetResponse.data);
          sheetErrorLog = `Status: ${sheetResponse.status}`;
        }
      } catch (sheetError) {
        console.error('Axios SheetDB Error:', sheetError.message);
        if (sheetError.response) {
          console.error('SheetDB Error Details:', sheetError.response.data);
          sheetErrorLog = JSON.stringify(sheetError.response.data);
        } else {
          sheetErrorLog = sheetError.message;
        }
      }
    }

    // 2. Send email notification if configured
    let emailSuccess = false;
    let emailErrorLog = null;
    if (process.env.NOTIFICATION_EMAIL && process.env.SENDGRID_API_KEY) {
      try {
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
        emailSuccess = true;
      } catch (emailError) {
        console.error('Failed to send email:', emailError.message);
        emailErrorLog = emailError.message;
      }
    }

    // Log the submission result
    console.log('Submission Result:', { 
      name, 
      sheet: sheetSuccess ? 'SUCCESS' : 'FAILED', 
      email: emailSuccess ? 'SUCCESS' : 'FAILED' 
    });

    // Return success to the user (since we don't want to block them if one part failed)
    // but include debug info for us to see.
    return res.status(200).json({ 
      success: true, 
      message: 'Thank you! We have received your inquiry.',
      debug: { 
        sheet: sheetSuccess, 
        email: emailSuccess,
        errors: {
          sheet: sheetErrorLog,
          email: emailErrorLog
        }
      }
    });

  } catch (error) {
    console.error('Critical Form Error:', error);
    return res.status(500).json({ 
      error: 'Failed to process submission. Please try again or email us directly.',
      detail: error.message
    });
  }
}
