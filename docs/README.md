# Reading Tracker

A personal, mobile-first web app (PWA) for tracking the books I read. It replaces a Notion database that was awkward to use on a phone.

The app only keeps records. There is no built-in reader: books are read on paper or in a separate e-reader app.

## Features

- **Library:** shelves (Want to read, Reading, Finished, Paused), a reading queue, paper and e-books, series and tags.
- **Add a book fast:** type a title, pick a result from Google Books, and the cover, author and page count are filled in. Everything can be edited by hand.
- **Reading sessions:** a timer or manual entry. Log the page where you stopped; pages read, time and speed are calculated for you. For e-books, enter a page or a percentage.
- **Goals:** a deadline per book (the daily page target is recalculated as you go), a daily page goal, and a yearly book goal.
- **Statistics:** per session, day, week, month and year; reading speed, streak, a reading calendar, time of day, and a year in review.
- **Notes and quotes:** quotes, thoughts and words, linked to a book and page. Photograph a page and extract text from it. Search, favorites, export to Markdown.
- **Reminders:** an optional push notification at a time you choose.

## Design

Light "steampunk-lite" style: stitched progress bars, dashed seams and a few rivets on a warm paper background. Light theme by default, dark theme available. Interface in Russian and English.

## Tech stack

- Next.js (App Router) and TypeScript
- Tailwind CSS with design tokens
- Supabase (Postgres, Auth, Storage)
- Google Books API for book data
- Claude Vision for text recognition from page photos
- Web Push for reminders
- Vercel for hosting

## Scope

- Single user, Android first, online only.
- No audiobooks and no data import.

## Project documents

All project documentation lives in [`docs/`](docs):

| File | Purpose |
|---|---|
| [`STATE.md`](docs/STATE.md) | Current state, hard rules and the next step |
| [`PLAN.md`](docs/PLAN.md) | Phases, data model and open questions |
| [`DESIGN.md`](docs/DESIGN.md) | Design tokens, typography, components and screens |
| [`PROMPTS.md`](docs/PROMPTS.md) | Prompts for Claude Code, by phase |
| [`mockups/`](docs/mockups) | Screen mockups |

## Getting started

The app is not built yet. Setup instructions will appear here after Phase 1 (the app skeleton).

## Status

Design phase complete; development starts with Phase 1. See [`docs/STATE.md`](docs/STATE.md) for the current step.
