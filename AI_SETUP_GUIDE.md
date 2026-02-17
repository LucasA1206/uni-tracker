
# AI Note Generation Setup Guide

This guide explains how to enable the AI Note Generation feature in your Uni Tracker app.

## 1. Prerequisites

You need an API key from OpenAI to perform:
1.  **Audio Transcription** (Whisper model)
2.  **Text Summarization & Formatting** (GPT-4o model)

### Get an OpenAI API Key
1.  Go to [platform.openai.com](https://platform.openai.com/).
2.  Sign up or log in.
3.  Create a new API key in the dashboard.
4.  Ensure your account has billing set up (API usage is not free).

## 2. Environment Configuration

Add your API key to the `.env` file in the root of your project:

```env
OPENAI_API_KEY="sk-..."
```

## 3. How It Works

### The Backend
We have created an API route at \`app/api/ai/generate-notes/route.ts\`.

**Process Flow:**
1.  **Upload**: The frontend sends the `.mp3` or `.mp4` file to this API route.
2.  **Transcribe**: The API sends the file to OpenAI's Whisper model (`whisper-1`).
    *   *Note: OpenAI has a 25MB file size limit for direct uploads. For larger files, you might need to chunk them or use a dedicated storage solution, but this implementation handles standard lecture clips nicely.*
3.  **Analyze & Generate**: The transcription text is sent to `gpt-4o` with a specific System Prompt that instructs it to follow the structure of your "DS&A Week1 Lecture" example (Overview, Key Points, Admin, etc.).
4.  **Save**: The generated Markdown is returned and saved to your database as a new Note.

## 4. Customizing the Output

If you want to change how the notes are formatted, look at the `SYSTEM_PROMPT` variable in `app/api/ai/generate-notes/route.ts`. You can tweak the instructions to change the tone, structure, or sections of the generated notes.
