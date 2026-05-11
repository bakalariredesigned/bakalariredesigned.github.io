import express from 'express';
import { createServer as createViteServer } from 'vite';
import { createProxyMiddleware } from 'http-proxy-middleware';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import * as cheerio from 'cheerio';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BAKALARI_BASE = 'https://mot-spsd.bakalari.cz';

// In-memory session store: sessionId -> { cookies, username, expiresAt }
const sessions = new Map<string, { cookies: string; username: string; expiresAt: number }>();

const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes

function generateSessionId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function getSession(sessionId: string) {
  const s = sessions.get(sessionId);
  if (!s) return null;
  if (Date.now() > s.expiresAt) {
    sessions.delete(sessionId);
    return null;
  }
  // Refresh TTL on access
  s.expiresAt = Date.now() + SESSION_TTL_MS;
  return s;
}

// Fetch a Bakaláři page with the stored cookies
async function fetchPage(cookies: string, url: string): Promise<string> {
  const res = await axios.get(url, {
    headers: {
      Cookie: cookies,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'cs-CZ,cs;q=0.9',
    },
    maxRedirects: 5,
    validateStatus: () => true,
  });
  return res.data as string;
}

// Perform web login and return cookies string
async function webLogin(username: string, password: string): Promise<string> {
  // Step 1: GET login page to get hidden fields + initial cookies
  const loginPageRes = await axios.get(`${BAKALARI_BASE}/login`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36',
    },
    maxRedirects: 5,
    validateStatus: () => true,
  });

  const rawCookies: string[] = loginPageRes.headers['set-cookie'] || [];
  let cookieJar = rawCookies.map((c: string) => c.split(';')[0]).join('; ');

  const $ = cheerio.load(loginPageRes.data as string);
  const viewState = $('input[name="__VIEWSTATE"]').val() as string || '';
  const viewStateGen = $('input[name="__VIEWSTATEGENERATOR"]').val() as string || '';
  const eventValidation = $('input[name="__EVENTVALIDATION"]').val() as string || '';

  // Step 2: POST login form
  const formData = new URLSearchParams();
  formData.append('__VIEWSTATE', viewState);
  formData.append('__VIEWSTATEGENERATOR', viewStateGen);
  formData.append('__EVENTVALIDATION', eventValidation);
  formData.append('username', username);
  formData.append('password', password);
  formData.append('LoginButton', 'Přihlásit');

  const loginRes = await axios.post(`${BAKALARI_BASE}/login`, formData.toString(), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Cookie: cookieJar,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36',
      Referer: `${BAKALARI_BASE}/login`,
    },
    maxRedirects: 0,
    validateStatus: (s) => s < 400 || s === 302,
  });

  const newCookies: string[] = loginRes.headers['set-cookie'] || [];
  if (newCookies.length > 0) {
    const newPairs = newCookies.map((c: string) => c.split(';')[0]);
    // Merge: new cookies override old ones by name
    const jar: Record<string, string> = {};
    cookieJar.split('; ').forEach(pair => {
      const [k, v] = pair.split('=');
      if (k) jar[k.trim()] = v || '';
    });
    newPairs.forEach(pair => {
      const [k, v] = pair.split('=');
      if (k) jar[k.trim()] = v || '';
    });
    cookieJar = Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; ');
  }

  // Verify we got an auth cookie (BakaAuth or similar)
  const hasAuth = cookieJar.includes('BakaAuth') || cookieJar.includes('.ASPXAUTH') || cookieJar.includes('ASP.NET_SessionId');
  if (!hasAuth && loginRes.status !== 302) {
    throw new Error('Login failed: no auth cookie received');
  }

  return cookieJar;
}

// Parse nástěnka page
function parseNastenky(html: string) {
  const $ = cheerio.load(html);
  const items: any[] = [];

  // Bakaláři nástěnka items are typically in .nastenka-item or table rows
  $('[class*="nastenka"], .board-item, .announcement-item, tr.item').each((_, el) => {
    const title = $(el).find('[class*="title"], h3, h4, .subject, td.subject').first().text().trim();
    const content = $(el).find('[class*="content"], [class*="text"], p, td.text').first().text().trim();
    const dateText = $(el).find('[class*="date"], time, .date, td.date').first().text().trim();
    const author = $(el).find('[class*="author"], [class*="sender"], .author, td.author').first().text().trim();

    if (title || content) {
      items.push({
        id: `nastenka-${items.length}`,
        title: title || '(Bez názvu)',
        content: content || '',
        dateCreated: dateText || new Date().toISOString(),
        author: author || '',
        isRead: false,
        priority: 2,
      });
    }
  });

  // Fallback: try generic article/section parsing
  if (items.length === 0) {
    $('article, .card, .panel, .message-item, .komens-item').each((_, el) => {
      const title = $(el).find('h1,h2,h3,h4,.title,.subject').first().text().trim();
      const content = $(el).find('p,.body,.content,.text').first().text().trim();
      const dateText = $(el).find('time,.date,.datetime').first().text().trim();
      const author = $(el).find('.author,.sender,.from').first().text().trim();

      if (title || content) {
        items.push({
          id: `nastenka-${items.length}`,
          title: title || '(Bez názvu)',
          content: content || '',
          dateCreated: dateText || new Date().toISOString(),
          author: author || '',
          isRead: false,
          priority: 2,
        });
      }
    });
  }

  return items;
}

// Parse komens page (messages/announcements)
function parseKomens(html: string) {
  const $ = cheerio.load(html);
  const items: any[] = [];

  // Try komens-specific selectors
  $('[class*="komens"], [class*="message"], [class*="zprava"], tr[data-id], .msg-row').each((_, el) => {
    const id = $(el).attr('data-id') || $(el).attr('id') || `komens-${items.length}`;
    const title = $(el).find('[class*="subject"], [class*="title"], .subject, td.subject').first().text().trim();
    const content = $(el).find('[class*="body"], [class*="content"], [class*="text"], .body, td.body').first().text().trim();
    const dateText = $(el).find('[class*="date"], time, .date, td.date').first().text().trim();
    const sender = $(el).find('[class*="sender"], [class*="from"], [class*="author"], .sender, td.sender').first().text().trim();
    const isUnread = $(el).hasClass('unread') || $(el).find('.unread').length > 0 || $(el).attr('data-read') === 'false';

    if (title || content) {
      items.push({
        id,
        title: title || '(Bez předmětu)',
        content: content || '',
        dateSent: dateText || new Date().toISOString(),
        sender: { name: sender || 'Neznámý odesílatel' },
        isRead: !isUnread,
        hasAttachment: $(el).find('[class*="attach"], .attachment, .priloha').length > 0,
      });
    }
  });

  // Fallback: generic rows
  if (items.length === 0) {
    $('article, .card, .panel, li.item').each((_, el) => {
      const title = $(el).find('h1,h2,h3,h4,.title,.subject').first().text().trim();
      const content = $(el).find('p,.body,.content').first().text().trim();
      const dateText = $(el).find('time,.date').first().text().trim();
      const sender = $(el).find('.author,.sender,.from').first().text().trim();

      if (title || content) {
        items.push({
          id: `komens-${items.length}`,
          title: title || '(Bez předmětu)',
          content: content || '',
          dateSent: dateText || new Date().toISOString(),
          sender: { name: sender || 'Neznámý odesílatel' },
          isRead: true,
          hasAttachment: false,
        });
      }
    });
  }

  return items;
}

async function startServer() {
  const app = express();
  app.use(express.json());
  const PORT = 3000;

  // ─── SCRAPER: Web Login ───────────────────────────────────────────────────
  app.post('/scraper/login', express.json(), async (req, res) => {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: 'username and password required' });
    }

    try {
      console.log(`[scraper] Web login for: ${username}`);
      const cookies = await webLogin(username, password);
      const sessionId = generateSessionId();
      sessions.set(sessionId, { cookies, username, expiresAt: Date.now() + SESSION_TTL_MS });
      console.log(`[scraper] Session created: ${sessionId}`);
      res.json({ sessionId, ok: true });
    } catch (err: any) {
      console.error('[scraper] Login error:', err.message);
      res.status(401).json({ error: 'Login failed', message: err.message });
    }
  });

  // ─── SCRAPER: Nástěnka ────────────────────────────────────────────────────
  app.get('/scraper/nastenky', async (req, res) => {
    const sessionId = req.headers['x-session-id'] as string;
    const session = sessionId ? getSession(sessionId) : null;

    if (!session) {
      return res.status(401).json({ error: 'No valid session. Login first via /scraper/login' });
    }

    try {
      console.log(`[scraper] Fetching nastenky for session: ${sessionId}`);
      const html = await fetchPage(session.cookies, `${BAKALARI_BASE}/next/nastenky.aspx`);
      const items = parseNastenky(html);
      console.log(`[scraper] Parsed ${items.length} nastenky items`);
      res.json({ items, scrapedAt: new Date().toISOString() });
    } catch (err: any) {
      console.error('[scraper] Nastenky error:', err.message);
      res.status(502).json({ error: 'Scrape failed', message: err.message });
    }
  });

  // ─── SCRAPER: Komens (all variants) ──────────────────────────────────────
  app.get('/scraper/komens', async (req, res) => {
    const sessionId = req.headers['x-session-id'] as string;
    const session = sessionId ? getSession(sessionId) : null;

    if (!session) {
      return res.status(401).json({ error: 'No valid session. Login first via /scraper/login' });
    }

    const variant = (req.query.variant as string) || '';
    const urlMap: Record<string, string> = {
      received: `${BAKALARI_BASE}/next/komens.aspx`,
      sent: `${BAKALARI_BASE}/next/komens.aspx?l=o`,
      concept: `${BAKALARI_BASE}/next/komens.aspx?l=Concept`,
      detail: `${BAKALARI_BASE}/next/komens_zprava.aspx`,
    };
    const url = urlMap[variant] || urlMap.received;

    try {
      console.log(`[scraper] Fetching komens (${variant || 'received'}) for session: ${sessionId}`);
      const html = await fetchPage(session.cookies, url);
      const items = parseKomens(html);
      console.log(`[scraper] Parsed ${items.length} komens items`);
      res.json({ items, variant: variant || 'received', scrapedAt: new Date().toISOString() });
    } catch (err: any) {
      console.error('[scraper] Komens error:', err.message);
      res.status(502).json({ error: 'Scrape failed', message: err.message });
    }
  });

  // ─── SCRAPER: Session status ──────────────────────────────────────────────
  app.get('/scraper/session', (req, res) => {
    const sessionId = req.headers['x-session-id'] as string;
    const session = sessionId ? getSession(sessionId) : null;
    if (!session) return res.status(401).json({ valid: false });
    res.json({ valid: true, username: session.username, expiresAt: new Date(session.expiresAt).toISOString() });
  });

  // ─── REST API Proxy ───────────────────────────────────────────────────────
  app.options('/api-proxy/*', (req, res) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.sendStatus(200);
  });

  app.post('/api-proxy/api/login', express.urlencoded({ extended: true }), async (req, res) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

    try {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(req.body || {})) {
        params.append(key, String(value));
      }
      console.log('[api] Login request to Bakalari REST API...');
      const apiRes = await axios.post('https://mot-spsd.bakalari.cz/api/login', params.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'cz.bakalari.app/1.0.0 (Android; 10)',
          Accept: 'application/json',
        },
      });
      console.log('[api] Login success:', apiRes.status);
      res.json(apiRes.data);
    } catch (err: any) {
      console.error('[api] Login proxy error:', err.message);
      if (err.response) {
        res.status(err.response.status).json(err.response.data);
      } else {
        res.status(502).json({ error: 'Proxy Error', message: err.message });
      }
    }
  });

  app.use(
    '/api-proxy',
    createProxyMiddleware({
      target: 'https://mot-spsd.bakalari.cz',
      changeOrigin: true,
      on: {
        proxyReq: (proxyReq) => {
          proxyReq.removeHeader('Origin');
          proxyReq.removeHeader('Referer');
          proxyReq.removeHeader('sec-ch-ua');
          proxyReq.removeHeader('sec-ch-ua-mobile');
          proxyReq.removeHeader('sec-ch-ua-platform');
          proxyReq.setHeader('User-Agent', 'cz.bakalari.app/1.0.0 (Android; 10)');
        },
        proxyRes: (proxyRes) => {
          proxyRes.headers['Access-Control-Allow-Origin'] = '*';
          proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
          proxyRes.headers['Access-Control-Allow-Headers'] = 'Origin, X-Requested-With, Content-Type, Accept, Authorization';
        },
        error: (err, _req, res: any) => {
          console.error('[proxy] Error:', err);
          res.status(502).json({ error: 'Proxy Error', message: (err as Error).message });
        },
      },
      pathRewrite: { '^/api-proxy': '' },
    })
  );

  // ─── Vite / Static ────────────────────────────────────────────────────────
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
