# Chris Mission Desk

Dark-mode Ops-Dashboard für Chris ↔ Agent Zusammenarbeit. Minimalistisches SaaS-UI, Supabase als Daten-Layer, Next.js (App Router) für schnelle Iterationen.

## Features (Stand 0.1)
- Responsive Dashboard-Layout (Sidebar, KPIs, Tasks, Activity Feed, Schedule)
- Demodaten zur Vorschau, automatische Fallbacks falls Supabase nicht konfiguriert
- Design orientiert sich an neon / glassmorphism Referenz
- Supabase Schema + Seed-SQL inklusive
- Fertige `.env.example`, Supabase Client stub, klare Deploy-Notizen

## Projektstruktur
```
src/
  app/
    page.tsx        # UI + Datenbindung
    globals.css     # Theme & Gradients
  lib/
    supabase.ts     # Client Factory (Browser)
supabase/schema.sql # Tabellen + Seeds
```

## Setup
```bash
npm install
cp .env.example .env.local
# trage deine Supabase URL + Anon Key ein
npm run dev -- --hostname 0.0.0.0 --port 3000
```

### Supabase vorbereiten
1. Neues Projekt anlegen → SQL Editor → Inhalt von `supabase/schema.sql` ausführen.
2. `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` aus dem Projekt kopieren.
3. (Optional) `SUPABASE_SERVICE_ROLE_KEY` setzen, falls Server Actions Schreibrechte brauchen.

## Deploy
- Vercel/Cloudflare/Fly möglich. Minimum: Node 18+.
- Env Vars im jeweiligen Dashboard hinterlegen.
- Domain/GoDaddy Pointing wie gewohnt.

## Nächste Steps
- Task CRUD (Server Actions + Form Dialoge)
- Activity/Event Live-Daten über Realtime oder Cron Sync
- Auth (Supabase Auth + Magic Link)
- Mobile Quick Actions (Task anlegen via Share Sheet / API)

## Scripts
- `npm run dev` – lokaler Server
- `npm run build && npm run start` – Production Preview

Feedback jederzeit via Telegram – UI/Copy kann ich schnell anpassen.
