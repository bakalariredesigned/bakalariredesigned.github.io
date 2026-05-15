/**
 * Cloudflare Pages Function – CORS proxy pro Bakaláři API
 *
 * Cílová URL školy se čte z hlavičky X-Bakalari-Host (posílá klient).
 * Fallback na mot-spsd.bakalari.cz pokud hlavička chybí.
 */

const FALLBACK_HOST = 'https://mot-spsd.bakalari.cz';

// Hlavičky, které nechceme přeposílat na cílový server
const BLOCKED_REQUEST_HEADERS = new Set([
  'host',
  'origin',
  'referer',
  'sec-ch-ua',
  'sec-ch-ua-mobile',
  'sec-ch-ua-platform',
  'sec-fetch-dest',
  'sec-fetch-mode',
  'sec-fetch-site',
  'cf-connecting-ip',
  'cf-ipcountry',
  'cf-ray',
  'cf-visitor',
  'x-forwarded-for',
  'x-forwarded-proto',
  'x-real-ip',
]);

// CORS hlavičky přidávané do každé odpovědi
const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
  'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Authorization',
};

export async function onRequest(context: { request: Request }): Promise<Response> {
  const { request } = context;
  const url = new URL(request.url);

  // Odpověď na CORS preflight (OPTIONS)
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: CORS_HEADERS,
    });
  }

  // Čti URL školy z hlavičky X-Bakalari-Host (posílá klient z localStorage)
  const TARGET_HOST = request.headers.get('X-Bakalari-Host') || FALLBACK_HOST;
  const targetPath = url.pathname.replace(/^\/api-proxy/, '') || '/';
  const targetUrl = `${TARGET_HOST}${targetPath}${url.search}`;

  // Sestav výstupní hlavičky (odfiltruj browser-specifické)
  const outHeaders = new Headers();
  for (const [key, value] of request.headers.entries()) {
    if (!BLOCKED_REQUEST_HEADERS.has(key.toLowerCase())) {
      outHeaders.set(key, value);
    }
  }
  // Předstírej Android Bakaláři aplikaci (obchází CORS omezení serveru)
  outHeaders.set('User-Agent', 'cz.bakalari.app/1.0.0 (Android; 10)');

  try {
    const proxyResponse = await fetch(targetUrl, {
      method: request.method,
      headers: outHeaders,
      body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
      redirect: 'follow',
    });

    // Zkopíruj odpověď a přidej CORS hlavičky
    const responseHeaders = new Headers();
    for (const [key, value] of proxyResponse.headers.entries()) {
      // Vynech hlavičky, které by způsobily problémy
      if (!['transfer-encoding', 'connection', 'keep-alive'].includes(key.toLowerCase())) {
        responseHeaders.set(key, value);
      }
    }
    // Přidej / přepiš CORS hlavičky
    for (const [key, value] of Object.entries(CORS_HEADERS)) {
      responseHeaders.set(key, value);
    }

    return new Response(proxyResponse.body, {
      status: proxyResponse.status,
      statusText: proxyResponse.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Proxy Error', message: String(error) }),
      {
        status: 502,
        headers: {
          'Content-Type': 'application/json',
          ...CORS_HEADERS,
        },
      }
    );
  }
}
