# NOVA MEMORY SYSTEM

Nova stores memories as structured knowledge rather than notes.

Memories evolve and gain importance over time.

---

## Memory Types

1. PERSON
People important to the user.

Examples:
- mom
- coworker Sarah
- Roman (child)

---

2. EVENT
Specific scheduled or past events.

Examples:
- doctor appointment
- birthday
- school meeting

---

3. PREFERENCE
Likes, dislikes, interests.

Examples:
- likes documentaries
- prefers texting over calls

---

4. HABIT
Recurring behavior detected automatically.

Examples:
- eats lunch around 2pm
- watches videos late at night

---

5. REMINDER
Action tied to time.

---

6. EMOTIONAL_SIGNAL
User mood indicators inferred gently.

---

## Database Schema (Supabase/Postgres)

### users
- id (uuid)
- created_at

---

### memories
- id (uuid)
- user_id (uuid)
- type (text)
- content (text)
- embedding (vector)
- importance_score (float)
- created_at
- updated_at

---

### people
- id
- user_id
- name
- relationship
- last_interaction
- importance_score

---

### reminders
- id
- user_id
- title
- datetime
- recurring_rule
- completed

---

### habits
- id
- user_id
- description
- detected_pattern
- confidence_score
- last_observed

---

### interactions
- id
- user_id
- raw_input
- parsed_intent
- timestamp

---

## Memory Flow

Conversation →
Intent Extraction →
Memory Classification →
Embedding Creation →
Database Storage →
Future Retrieval

---

## Memory Retrieval Logic

When generating responses:
1. Embed user message
2. Vector search similar memories
3. Retrieve top relevant memories
4. Inject into LLM context

---

## Importance Scoring

Each memory increases score when:
- referenced again
- tied to emotions
- tied to recurring events

Low-score memories decay over time.
