# Google Search Console Verification Setup

## How to Verify Your Site with Google

### Step 1: Get Verification File from Google

1. Go to [Google Search Console](https://search.google.com/search-console)
2. Click "Add Property"
3. Enter your website URL (e.g., `https://your-app.vercel.app`)
4. Choose "HTML file upload" verification method
5. Download the verification HTML file (it will be named something like `google1234567890abcdef.html`)

### Step 2: Add Verification File to Your Project

You have two options:

#### Option A: Place in Public Folder (Recommended)

1. Take the downloaded HTML file from Google
2. Place it in the `public` folder of your project
3. Keep the exact filename (e.g., `google1234567890abcdef.html`)
4. Deploy to Vercel
5. The file will be accessible at: `https://your-domain.com/google1234567890abcdef.html`

#### Option B: Use Route Handler

1. Open the downloaded HTML file
2. Copy its contents
3. Update `app/google-verification/route.ts` with the actual HTML content
4. The route will serve the verification file

### Step 3: Verify in Google Search Console

1. Go back to Google Search Console
2. Click "Verify"
3. Google will check for the file at the URL you specified
4. Once verified, you can manage your site in Search Console

## Important Notes

- The verification file must be accessible at the exact URL you specified in Google Search Console
- The file must remain on your site for verification to stay active
- You can delete the file after verification, but it's recommended to keep it

