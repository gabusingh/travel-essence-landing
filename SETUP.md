# Contact Form Setup Guide

The contact form is now integrated and ready to work! Here's how to set it up:

## How It Works

The form uses **Vercel Serverless Functions** to handle submissions. When deployed on Vercel, the form will automatically work and log submissions to your Vercel dashboard.

## Basic Setup (Already Working!)

✅ The form will work immediately after deployment to Vercel
✅ All submissions are logged in Vercel's function logs
✅ You can view submissions in your Vercel dashboard under "Functions" → "Logs"

## Optional: Email Notifications

To receive email notifications when someone submits the form, add these environment variables in your Vercel dashboard:

### Using SendGrid (Recommended - Free tier available)

1. Sign up for SendGrid: https://sendgrid.com/
2. Create an API key
3. Add these environment variables in Vercel:
   - `SENDGRID_API_KEY` = your SendGrid API key
   - `NOTIFICATION_EMAIL` = Yvonne@yournarratives.com (or your email)
   - `FROM_EMAIL` = noreply@yourdomain.com (verified sender in SendGrid)

## Optional: Google Sheets Integration

To save submissions to a Google Sheet:

1. Create a Google Sheet
2. Use a service like [Sheet.best](https://sheet.best/) or [SheetDB](https://sheetdb.io/) to get an API endpoint
3. Add this environment variable in Vercel:
   - `GOOGLE_SHEETS_URL` = your Google Sheets API endpoint

## Alternative: Simple Email Setup

If you prefer a simpler solution, you can use:
- **Formspree** (https://formspree.io/)
- **Getform** (https://getform.io/)
- **Web3Forms** (https://web3forms.com/)

Just replace the form action in the HTML.

## Testing Locally

To test the form locally:

```bash
# Install Vercel CLI if you haven't
npm i -g vercel

# Run local development server
vercel dev
```

Then open http://localhost:3000 to test the form.

## Viewing Submissions

### In Vercel Dashboard:
1. Go to your project on Vercel
2. Click "Functions" in the sidebar
3. Click on `/api/submit-form`
4. View the logs to see all submissions

### With Email Setup:
You'll receive an email for each submission with all the details.

### With Google Sheets:
All submissions will appear as new rows in your spreadsheet.

## Form Features

✅ Email capture (required field)
✅ Client-side validation
✅ Loading states with spinner
✅ Success/error messages
✅ Smooth animations
✅ Mobile responsive
✅ Accessible (ARIA labels, keyboard navigation)
✅ Modern UX with teal branding
