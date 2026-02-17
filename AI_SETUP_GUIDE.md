
# AI Note Generation Setup Guide (Gemini Edition)

This guide explains how to enable the AI Note Generation feature in your Uni Tracker app using **Google Gemini**.

## 1. Prerequisites

You need an API key from Google AI Studio to perform multimodal analysis (Audio/Video -> Text).

### Get a Google API Key
1.  Go to [aistudio.google.com](https://aistudio.google.com/).
2.  Sign in with your Google Account.
3.  Click **"Get API key"**.
4.  Create a key in a new project.

## 2. Environment Configuration

Add your API key to the `.env` file in the root of your project:

```env
GOOGLE_API_KEY="AIzaSy..."
```

## 3. How It Works

### The Backend
We have updated the API route at \`app/api/ai/generate-notes/route.ts\`.

**Process Flow:**
1.  **Upload**: The frontend sends the `.mp3` or `.mp4` file to this API route.
2.  **Gemini Upload**: The API uploads the file to the Google Generative AI File API.
3.  **Process**: Gemini processes the audio/video file directly (no separate transcription step needed!).
4.  **Generate**: The `gemini-1.5-flash` model analyzes the content and generates structured notes based on the system prompt.
5.  **Save**: The generated Markdown is returned and saved to your database as a new Note.

## 4. Advantages of Gemini Implementation
-   **Multimodal**: Can "watch" video and "listen" to audio natively.
-   **Large Context Window**: Can handle very long lectures (up to 1 hour+ easily).
-   **Cost Effective**: Gemini 1.5 Flash is very affordable/free in the lower tier.

## 5. Troubleshooting
-   **File Size**: Ensure your uploads are within reasonable limits (though Gemini supports up to 2GB, your server might limit body size).
-   **Processing Time**: Long videos might take a few seconds to process after upload before generation starts.
