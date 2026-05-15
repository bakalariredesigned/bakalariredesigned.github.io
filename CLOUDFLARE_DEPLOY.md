# Nasazení na Cloudflare Pages

Tento projekt je připraven pro nasazení na **Cloudflare Pages** (zdarma).

---

## Způsob 1: Přes Cloudflare Dashboard (doporučeno)

1. Přejdi na [dash.cloudflare.com](https://dash.cloudflare.com)
2. Vyber **Pages → Create a project → Direct Upload**
3. Buildni projekt lokálně:
   ```bash
   npm run build
   ```
4. Uploadni složku `dist/` (vznikne po buildu)
5. Cloudflare automaticky najde a nasadí i funkce ze složky `functions/`

---

## Způsob 2: Přes Git repozitář (automatické deploye)

1. Nahraj kód na GitHub / GitLab
2. V Cloudflare Pages: **Connect to Git → vyber repozitář**
3. Nastavení:
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Node.js version:** 20 (nebo vyšší)

Cloudflare Pages bude automaticky deployovat při každém `git push`.

---

## Způsob 3: Přes Wrangler CLI

```bash
# Nainstaluj Wrangler
npm install -g wrangler

# Přihlas se do Cloudflare
wrangler login

# Buildni a nasaď
npm run build
wrangler pages deploy dist --project-name=bakalari-redesign
```

---

## Jak to funguje po nasazení

```
Prohlížeč → Cloudflare Pages (statické soubory)
                    ↓
           /api-proxy/* požadavky
                    ↓
    Cloudflare Pages Function (functions/api-proxy/[[path]].ts)
                    ↓
    https://mot-spsd.bakalari.cz (Bakaláři API)
```

### Proxy funkce:
- Soubor `functions/api-proxy/[[path]].ts` nahrazuje Express.js server
- Přeposílá API volání na Bakaláři server
- Přidává `User-Agent: cz.bakalari.app/1.0.0` (tváří se jako Android app)
- Odstraňuje CORS omezení

### SPA routing:
- Soubor `public/_redirects` zajišťuje, že všechny URL vedou na `index.html`
- Potřebné pro React Router (přímé URL jako `/timetable` fungují)

---

## Lokální vývoj s Cloudflare

Pro lokální testování funkce proxy:
```bash
# Nainstaluj Wrangler
npm install -g wrangler

# Spusť s Wrangler (emuluje Cloudflare Workers prostředí)
wrangler pages dev dist --compatibility-date=2024-09-23

# NEBO pro live-reload vývoj:
npm run build && wrangler pages dev dist
```

Pro rychlý vývoj bez proxy (Express server):
```bash
npm run dev
```

---

## Poznámky

- Přihlašovací údaje (username/heslo) jsou uloženy pouze v `localStorage` tvého prohlížeče
- Server neukládá žádné osobní údaje – vše jde přímo přes Cloudflare → Bakaláři
- `GEMINI_API_KEY` v `.env` není pro základní fungování potřeba
