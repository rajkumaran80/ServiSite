const BASE_DOMAIN = 'servisite.co.uk';
const RESOLVE_API = 'https://api.servisite.co.uk/api/v1/tenant/by-domain';

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const host = url.hostname;

    // Pass servisite.co.uk and *.servisite.co.uk through unchanged
    if (host === BASE_DOMAIN || host.endsWith(`.${BASE_DOMAIN}`)) {
      return fetch(request);
    }

    // Resolve custom domain → tenant slug
    let slug;
    try {
      const res = await fetch(`${RESOLVE_API}?domain=${encodeURIComponent(host)}`);
      if (!res.ok) return notFound(host);
      const body = await res.json();
      slug = body?.data?.slug;
    } catch {
      return new Response('Gateway error', { status: 502 });
    }

    if (!slug) return notFound(host);

    // Rewrite to tenant subdomain — Azure FD receives Host: {slug}.servisite.co.uk
    const newUrl = new URL(request.url);
    newUrl.hostname = `${slug}.${BASE_DOMAIN}`;

    const newRequest = new Request(newUrl.toString(), {
      method: request.method,
      headers: request.headers,
      body: request.body,
      redirect: 'manual',
    });

    const response = await fetch(newRequest);

    // Preserve redirect Location header but rewrite internal subdomain URLs back to custom domain
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (location) {
        const rewritten = location.replace(`${slug}.${BASE_DOMAIN}`, host);
        const headers = new Headers(response.headers);
        headers.set('location', rewritten);
        return new Response(response.body, { status: response.status, headers });
      }
    }

    return response;
  },
};

function notFound(host) {
  return new Response(`No tenant found for ${host}`, { status: 404 });
}
