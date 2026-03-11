# 🍌 Minion Match-Game: Classic Edition 🏆

**Minion Match-Game** is a high-performance memory matching game featuring the beloved Minions. It offers a sophisticated UI, smooth animations, and a seamless user experience designed for ultimate fun.

![Banner](https://raw.githubusercontent.com/jpjp92/minion-match-game/main/public/images/27.jpg)

## 🌟 Key Features

1. **Smart Session Management** 🆔
   - Enter your nickname once and play as much as you want! Your identity is remembered during the session.
   - Starting from your second game, scores are **automatically saved** and linked to the Hall of Fame without extra typing.
   - Resets only when you refresh the page, keeping the flow fast and uninterrupted.

2. **Dynamic Missions (Difficulty)** ⚡
   - **EASY**: 6 pairs of Minions (12 cards) - Perfect for a quick warm-up.
   - **NORMAL**: 8 pairs of Minions (16 cards) - Requires extra focus and memory.

3. **Premium Visual Experience** ✨
   - **3D Flip Animation**: Realistic card-flipping effects powered by CSS 3D transforms.
   - **Glassmorphism UI**: A modern, sleek design system for a premium look and feel.
   - **Preview Mode**: A 5-second "Memorize" phase before each game to test your brain power.

4. **Cloud-Powered Hall of Fame** 🥇
   - Scores are persisted to a **Supabase** PostgreSQL database via Vercel Serverless Functions.
   - Leaderboard is ranked by **fewest moves first**, then **fastest time** as a tiebreaker.
   - Falls back to `localStorage` if the cloud API is unavailable, so play is never interrupted.

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | `React 19`, `TypeScript` |
| Styling | `Tailwind CSS`, Custom CSS Keyframes |
| Bundler | `Vite` |
| Backend API | Vercel Serverless Functions (`api/scores.ts`) |
| Database | `Supabase` (PostgreSQL) |
| Assets | Dynamic image loading via GitHub API |

## 🗄️ Database Setup (Supabase)

Run the following SQL in your Supabase **SQL Editor** to create the leaderboard table:

```sql
CREATE TABLE IF NOT EXISTS public.minion_scores (
  id          BIGSERIAL PRIMARY KEY,
  player_name TEXT        NOT NULL,
  difficulty  TEXT        NOT NULL CHECK (difficulty IN ('EASY', 'NORMAL')),
  moves       INTEGER     NOT NULL,
  time_taken  INTEGER     NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_minion_scores_leaderboard
  ON public.minion_scores (difficulty, moves ASC, time_taken ASC);

ALTER TABLE public.minion_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read" ON public.minion_scores FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON public.minion_scores FOR INSERT WITH CHECK (true);
```

## 📦 Installation & Setup

```bash
# Clone the repository
git clone https://github.com/jpjp92/minion-match-game.git

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Fill in SUPABASE_URL and SUPABASE_ANON_KEY in .env.local

# Run the local development server (requires Vercel CLI for API routes)
npx vercel dev
```

### Required Environment Variables

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | Your Supabase `anon` / public key |

## 🎮 How to Play

1. Enter your **Agent Name** on the main screen.
2. Select your mission difficulty (**EASY** or **NORMAL**).
3. Memorize the cards during the **5-second preview**.
4. Click cards to find matching pairs of Minions.
5. Score = fewest moves → fastest time.
6. Once the mission is complete, your score is **automatically uploaded** to the Cloud Hall of Fame.

---

**"Bello! Ba-na-naaaaaa! 🍌 Good luck on your mission, Agent!"**

---
© 2026 Minion Match Team. All Rights Reserved.
