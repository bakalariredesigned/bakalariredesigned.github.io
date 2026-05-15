import express, { Response } from 'express';
import { createServer as createViteServer } from 'vite';
import { createProxyMiddleware } from 'http-proxy-middleware';
import path from 'path';
import { fileURLToPath } from 'url';
import { load } from 'cheerio';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper function to scrape messages from Bakalari web
async function scrapeMessages(token: string) {
  try {
    const response = await axios.get('https://mot-spsd.bakalari.cz/webportal/Messages/Index', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const $ = load(response.data);
    const messages: any[] = [];
    
    // Parse messages - adjust selectors based on actual HTML structure
    $('tr').each((i, el) => {
      const cells = $(el).find('td');
      if (cells.length > 0) {
        const sender = $(cells[0]).text().trim();
        const subject = $(cells[1]).text().trim();
        const date = $(cells[2]).text().trim();
        
        if (sender && subject) {
          messages.push({ 
            id: `msg-${i}`,
            sender, 
            subject, 
            date, 
            isRead: true 
          });
        }
      }
    });
    
    return messages.slice(0, 10); // Return first 10 messages
  } catch (error) {
    console.error('Error scraping messages:', error);
    return [];
  }
}

// Helper function to scrape announcements from Bakalari web
async function scrapeAnnouncements(token: string) {
  try {
    const response = await axios.get('https://mot-spsd.bakalari.cz/webportal/Komens/Index', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const $ = load(response.data);
    const announcements: any[] = [];
    
    // Parse announcements - adjust selectors based on actual HTML structure
    $('[class*="announcement"], [class*="komen"], .card').each((i, el) => {
      const title = $(el).find('h1, h2, h3, .title').text().trim();
      const content = $(el).find('p, .content, .description').text().trim();
      const date = $(el).find('[class*="date"], .date').text().trim();
      
      if (title) {
        announcements.push({ 
          id: `ann-${i}`,
          title, 
          content: content.slice(0, 100), 
          date, 
          priority: 2 
        });
      }
    });
    
    return announcements.slice(0, 10); // Return first 10 announcements
  } catch (error) {
    console.error('Error scraping announcements:', error);
    return [];
  }
}

// Helper function to scrape absences from Bakalari web
async function scrapeAbsences(token: string) {
  try {
    const response = await axios.get('https://mot-spsd.bakalari.cz/webportal/Absence/Index', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const $ = load(response.data);
    const absences: any[] = [];
    
    // Parse absences - adjust selectors based on actual HTML structure
    $('tr').each((i, el) => {
      const cells = $(el).find('td');
      if (cells.length > 0) {
        const date = $(cells[0]).text().trim();
        const hours = $(cells[1]).text().trim();
        const status = $(cells[2]).text().trim();
        const reason = $(cells[3])?.text().trim() || 'Neuvedeno';
        
        if (date) {
          absences.push({ 
            id: `abs-${i}`,
            DateFrom: date,
            DateTo: date,
            Hours: hours || '0',
            Type: reason,
            ApprovalState: status || 'pending',
            ApprovalStateMessage: status || 'Pending',
            ApprovalText: reason
          });
        }
      }
    });
    
    return absences.slice(0, 20); // Return first 20 absences
  } catch (error) {
    console.error('Error scraping absences:', error);
    return [];
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Handle preflight OPTIONS requests for the proxy directly
  app.options('/api-proxy/*', (req, res) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.sendStatus(200);
  });

  // Explicit login proxy endpoint to avoidhttp-proxy-middleware bugs
  app.post('/api-proxy/api/login', express.urlencoded({ extended: true }), async (req, res) => {
    // Add CORS headers for direct accesses
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    
    try {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(req.body || {})) {
        params.append(key, String(value));
      }

      console.log('Sending login request to Bakalari...', params.toString());
      
      const { default: axios } = await import('axios');
      const apiRes = await axios.post('https://mot-spsd.bakalari.cz/api/login', params.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'cz.bakalari.app/1.0.0 (Android; 10)',
          'Accept': 'application/json'
        }
      });
      console.log('Login success:', apiRes.status);
      res.json(apiRes.data);
    } catch (err: any) {
      console.log('Login proxy error:', err.message);
      if (err.response) {
        console.log('Bakalari responded with:', err.response.status, (typeof err.response.data === 'string' ? err.response.data.slice(0, 50) : err.response.data));
        res.status(err.response.status).json(err.response.data);
      } else {
        res.status(502).json({ error: 'Proxy Error', message: err.message });
      }
    }
  });

  // Generic Proxy for all other Bakalari API calls
  app.use(
    '/api-proxy',
    createProxyMiddleware({
      target: 'https://mot-spsd.bakalari.cz',
      changeOrigin: true,
      on: {
        proxyReq: (proxyReq, req, res) => {
          // Remove tracking/browser headers
          proxyReq.removeHeader('Origin');
          proxyReq.removeHeader('Referer');
          proxyReq.removeHeader('sec-ch-ua');
          proxyReq.removeHeader('sec-ch-ua-mobile');
          proxyReq.removeHeader('sec-ch-ua-platform');
          
          // Spoof User-Agent to look like the Bakalari Android App
          proxyReq.setHeader('User-Agent', 'cz.bakalari.app/1.0.0 (Android; 10)');
        },
        proxyRes: (proxyRes, req, res) => {
          // Force CORS headers on every response
          proxyRes.headers['Access-Control-Allow-Origin'] = '*';
          proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
          proxyRes.headers['Access-Control-Allow-Headers'] = 'Origin, X-Requested-With, Content-Type, Accept, Authorization';
        },
        error: (err, req, res) => {
          console.log('Proxy Error:', err);
          (res as Response).status(502).json({ error: 'Proxy Error', message: err.message });
        }
      },
      pathRewrite: {
        '^/api-proxy': '', // remove /api-proxy from the forwarded path
      }
    })
  );

  // Scraping endpoints for real-time data
  app.get('/api/scrape/messages', async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const messages = await scrapeMessages(token);
    res.json({ messages });
  });

  app.get('/api/scrape/announcements', async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const announcements = await scrapeAnnouncements(token);
    res.json({ announcements });
  });

  app.get('/api/scrape/absences', async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const absences = await scrapeAbsences(token);
    res.json({ absences });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
