# Google Search Console Verification - Quick Setup

## Method 1: Public Folder (Easiest)

1. **Download verification file from Google Search Console:**
   - Go to https://search.google.com/search-console
   - Add your property
   - Choose "HTML file upload" method
   - Download the file (e.g., `google1234567890abcdef.html`)

2. **Add to your project:**
   - Place the downloaded file in the `public` folder
   - Keep the exact filename
   - Commit and push to your repository

3. **Verify:**
   - The file will be accessible at: `https://your-domain.com/google1234567890abcdef.html`
   - Go back to Google Search Console and click "Verify"

## Method 2: Route Handler

1. **Download verification file from Google Search Console** (same as above)

2. **Update the route:**
   - Open `app/google-verification/route.ts`
   - Copy the entire contents of the downloaded HTML file
   - Replace the `htmlContent` variable with the actual verification HTML

3. **Verify:**
   - The file will be accessible at: `https://your-domain.com/google-verification.html`
   - Update the URL in Google Search Console to match this path
   - Go back to Google Search Console and click "Verify"

## Important Notes

- The verification file must remain on your site for verification to stay active
- The URL in Google Search Console must exactly match where the file is accessible
- After verification, you can optionally remove the file, but it's recommended to keep it

