# PRD – Bakaláři 3.0 Redesign

## Popis projektu
Moderní dark-theme webová aplikace (redesign) pro systém Bakaláři – školní portál SPŠD Motol.
Slouží jako plnohodnotná náhrada původního frontendu Bakaláři s lepším UX/UI.

## Tech Stack
- **Frontend**: React 19 + TypeScript + Vite 6 + Tailwind CSS v4
- **Animace**: Framer Motion (motion/react)
- **Grafy**: Recharts
- **Ikony**: Lucide React
- **Proxy**: Cloudflare Pages Function (dříve Express.js)
- **Routing**: React Router v7

## Architektura
```
Browser → Cloudflare Pages (static dist/)
               ↓ /api-proxy/*
    Cloudflare Pages Function (functions/api-proxy/[[path]].ts)
               ↓
    https://mot-spsd.bakalari.cz (Bakaláři API)
```

## Klíčové funkce
- Login přes Bakaláři OAuth (token uložen v localStorage)
- Dashboard: dnešní rozvrh, průměr, absence, úkoly
- Rozvrh hodin (týdenní, mobilní i desktop view)
- Klasifikace: grafy trendu, seznam předmětů s průměry
- Domácí úkoly: Kanban layout (k vypracování / hotovo)
- Absence: per-day, per-subject, pozdní příchody
- Zprávy: přijaté/odeslané, reply, compose
- Oznámení (nástěnka/Komens)

## Základní požadavky (statické)
- SPA, vše v prohlížeči (bez serverového stavu)
- CORS proxy přes Worker (povinné, Bakaláři API blokuje přímé volání)
- User-Agent spoofing na Android Bakaláři app

## Co bylo implementováno
- **2025-02**: Kompletní Cloudflare Pages deployment příprava
  - `functions/api-proxy/[[path]].ts` – nahrazuje Express proxy
  - `public/_redirects` – SPA routing fallback
  - `wrangler.toml` – Cloudflare konfigurace
  - `CLOUDFLARE_DEPLOY.md` – návod k nasazení
  - Build ověřen: `npm run build` → `dist/` (864 KB JS, 28 KB CSS)

## Backlog / P2 Features
- Code splitting (chunk > 500 KB varování)
- PWA manifest (offline support)
- Light/dark mode toggle
- Přidání vlastního školního Bakaláři URL (nyní hardcoded na mot-spsd.bakalari.cz)
- Wrangler Pages dev pro lokální testování s proxy

## Jak nasadit
Viz `CLOUDFLARE_DEPLOY.md`
