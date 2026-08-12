import type { APIRoute } from 'astro';

export const prerender = false;

const headers = { 'Cache-Control': 'no-store' };

export const GET: APIRoute = () => Response.json({ ok: true }, { headers });

export const HEAD: APIRoute = () => new Response(null, { headers });

export const ALL: APIRoute = () =>
  new Response(null, {
    status: 405,
    headers: {
      ...headers,
      Allow: 'GET, HEAD',
    },
  });
