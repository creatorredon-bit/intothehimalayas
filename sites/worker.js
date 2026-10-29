/**
 * Cloudflare Workers entry point for IntotheHimalayas.
 *
 * The Vite build is uploaded as Workers Static Assets (the `ASSETS` binding).
 * This worker serves those assets and falls back to `/index.html` for client-side
 * routes such as /explore or /trails/everest-base-camp-trek, so deep links survive
 * a hard refresh. Requests that look like a missing file stay 404, so a broken
 * script tag fails loudly instead of being answered with HTML.
 */
const SECURITY_HEADERS = {
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'x-frame-options': 'SAMEORIGIN',
};

/** Last path segment has a file extension, e.g. `/assets/index-a1b2.js`. */
const FILE_LIKE = /\/[^/]*\.[a-z0-9]+$/i;

function finalise(response, { html = false } = {}) {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) headers.set(name, value);

  const contentType = headers.get('content-type') ?? '';
  if (html || contentType.startsWith('text/html')) {
    headers.set('content-type', 'text/html; charset=utf-8');
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export default {
  async fetch(request, env) {
    const assetResponse = await env.ASSETS.fetch(request);
    const { pathname } = new URL(request.url);

    // Non-HTML requests are either real assets, or genuinely missing files.
    const wantsHtml = (request.headers.get('accept') || '').includes('text/html');
    if (assetResponse.status !== 404 || request.method !== 'GET' || !wantsHtml || FILE_LIKE.test(pathname)) {
      return finalise(assetResponse);
    }

    const indexResponse = await env.ASSETS.fetch(
      new Request(new URL('/index.html', request.url), { method: 'GET', headers: request.headers }),
    );
    if (indexResponse.status !== 200) return finalise(assetResponse);

    return finalise(indexResponse, { html: true });
  },
};
