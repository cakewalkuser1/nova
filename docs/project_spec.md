# PROJECT: NOVA — AI LIFE COMPANION

## Overview
Nova is a voice-first AI life companion that learns a user's habits, relationships, preferences, and routines over time.

Nova acts as a calm, thoughtful assistant that remembers information naturally and provides gentle reminders, recommendations, and emotional check-ins.

The system prioritizes:
- natural conversation
- long-term memory
- habit learning
- proactive but non-intrusive support

This is NOT a productivity app.
This is a persistent AI companion with evolving memory.

---

## Core Features (MVP)

### 1. Conversational Interface
- chat + voice input
- natural commands
- no forms or manual setup

### 2. Memory System
- extract structured memories from conversation
- store people, events, habits, preferences
- recall context intelligently

### 3. Reminder Engine
- user-created reminders via conversation
- AI-suggested reminders from detected habits

### 4. Habit Learning
- detect recurring behaviors
- suggest helpful nudges

### 5. Recommendation Engine
- fetch internet content based on interests
- adapt recommendations over time

### 6. Emotional Check-ins
- occasional supportive prompts
- non-therapeutic tone

---

## Tech Stack

### Frontend
- Next.js (App Router)
- React
- TailwindCSS
- Web Speech API (voice input)

### Backend
- Node.js (TypeScript)
- API routes via Next.js OR Express server

### AI Layer
- OpenAI API (primary LLM)
- Embeddings for memory retrieval

### Database
- Supabase (Postgres)
- pgvector extension for embeddings

### Voice
- Whisper API (speech-to-text)
- OpenAI TTS or ElevenLabs (text-to-speech)

### Background Jobs
- cron scheduler for reminders + habit analysis

### Hosting
- Vercel (frontend/backend)
- Supabase hosted DB

### Environment (required / optional)

Set these in `.env.local` and in Vercel project settings as needed:

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase (or `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`) |
| `OPENAI_API_KEY` | Chat intent extraction and replies |
| `CRON_SECRET` | Optional; when set, cron and push/send routes require `Authorization: Bearer <value>` (Vercel Cron sends it automatically) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | Web push notifications; optional `VAPID_SUBJECT` (e.g. `mailto:you@example.com`) |
| `TWILIO_AUTH_TOKEN` | Twilio webhook signature verification (SMS); optional if not using SMS |
| Twilio Account SID, phone numbers | For sending/receiving SMS |

---

## System Architecture

```
User Input (voice/text)
        ↓
Intent Extraction (LLM)
        ↓
Memory Classifier
        ↓
Database Storage
        ↓
Habit Analyzer
        ↓
Response Generator
        ↓
Notification Engine
```

---

## Design Principles

- Voice-first interaction
- Minimal UI friction
- Memory over commands
- Suggestions over instructions
- Calm interaction frequency

---

## MVP Goal

User can say:
> "Hey Nova, remind me to call my mom tomorrow."

Nova will:
1. Understand intent
2. Store reminder
3. Remember relationship context
4. Trigger notification later

---

## Future Expansion (NOT MVP)
- cross-device syncing
- wearable integration
- emotional trend insights
- autonomous scheduling
- personal knowledge graph visualization
