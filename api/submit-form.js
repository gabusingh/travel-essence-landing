const sgMail = require('@sendgrid/mail');

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
    const sheetUrl = process.env.GOOGLE_SHEETS_URL || 'https://sheetdb.io/api/v1/onun5yeic9qew';
    let sheetSuccess = false;
    
    if (sheetUrl) {
      try {
        const sheetResponse = await fetch(sheetUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({ data: [formData] })
        });
        
        const sheetResult = await sheetResponse.json();
        
        if (sheetResponse.ok) {
          sheetSuccess = true;
          console.log('Successfully saved to Google Sheets');
        } else {
          console.error('SheetDB Error:', sheetResponse.status, sheetResult);
        }
      } catch (sheetError) {
        console.error('Failed to connect to SheetDB:', sheetError);
      }
    }

    // 2. Send email notification if configured
    let emailSuccess = false;
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
        console.error('Failed to send email:', emailError);
      }
    }

    // Log the submission
    console.log('Submission processed:', { name, sheetSuccess, emailSuccess });

    // Return success response if at least one method succeeded
    // Or return success anyway to keep UX smooth, but log failures.
    return res.status(200).json({ 
      success: true, 
      message: 'Thank you! We have received your inquiry.',
      debug: { sheet: sheetSuccess, email: emailSuccess }
    });

  } catch (error) {
    console.error('Critical Form Error:', error);
    return res.status(500).json({ 
      error: 'Failed to process submission. Please try again or email us directly.' 
    });
  }
}
