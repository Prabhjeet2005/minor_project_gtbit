# AI Interviewer & Dashboard

This isolated minor project features a real-time conversational AI interviewer that conducts mock technical interviews and a dashboard to track past performance.

## Core Features
*   **AI Interviewer:** Dynamic, real-time technical interviews via WebSockets.
*   **Natural Voice Generation:** Deepgram Aura integration for human-like TTS.
*   **Dashboard:** Tracks historical interview data, feedback, and scores.

## Setup Instructions

**Backend Setup**
```bash
cd server
npm install

```

Create a `.env` file in the `server` directory:

```env
PORT=5001
GEMINI_API_KEY=AIzaSyBbJvsPJ5Dl6rt36f9_EC178EIKi8ljlbc

DEEPGRAM_API_KEY=

# GROQ API
GROQ_API_KEY=
GROQ_MODEL=openai/gpt-oss-20b
GEMINI_MODEL=gemini-3-pro

CURRENT_AI_PROVIDER=GROQ

MONGO_URI=

# TTS_PROVIDER=GOOGLE
TTS_PROVIDER=DEEPGRAM

JWT_SECRET=
NODE_ENV=development

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

```

Run `npm start` to launch.

**Frontend Setup**

```bash
cd client
npm install

```

Create a `.env.local` file in the `client` directory:

```env
NEXT_PUBLIC_API_URL=http://localhost:5001/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:5001

```

Run `npm run dev` to launch.
