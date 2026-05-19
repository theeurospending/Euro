// Custom worker entrypoint wrapping the OpenNext worker.
// Adds a `scheduled` handler for Cloudflare cron triggers.
// IMPORTANT: never use outbound fetch() to self — always invoke the worker
// internally via `openNextWorker.fetch(new Request(...), env, ctx)` so requests
// stay inside the same isolate and use the same bindings.

import openNextWorker from './.open-next/worker.js';

// Re-export Durable Object classes that OpenNext defines.
// Cloudflare requires every DO class binding to be exported from the entrypoint.
export {
  DOQueueHandler,
  DOShardedTagCache,
  BucketCachePurge,
} from './.open-next/worker.js';

export default {
  async fetch(request, env, ctx) {
    return openNextWorker.fetch(request, env, ctx);
  },

  async scheduled(event, env, ctx) {
    const cronToTarget = {
      '0 6 * * *':    { path: '/api/cron/ingest', cron: 'daily-06' },
      '0 7 * * 1':    { path: '/api/cron/ingest', cron: 'weekly-mon-07' },
      '0 8 1 * *':    { path: '/api/cron/ingest', cron: 'monthly-1st-08' },
      '0 9 1 */3 *':  { path: '/api/cron/ingest', cron: 'quarterly-09' },
      '0 10 1 3 *':   { path: '/api/cron/ingest', cron: 'annual-march-10' },
      '0 9 * * 1':    { path: '/api/cron/social', cron: 'weekly-mon-09' },
      '*/15 * * * *': { path: '/api/cron/social', cron: 'every-15' },
    };

    const target = cronToTarget[event.cron];
    if (!target) {
      console.warn(`[scheduled] no handler for cron "${event.cron}"`);
      return;
    }

    const url = new URL(target.path, 'https://internal.invalid');
    url.searchParams.set('cron', target.cron);

    const req = new Request(url.toString(), {
      method: 'POST',
      headers: {
        'x-ingest-api-key': env.INGEST_API_KEY ?? '',
        'content-type': 'application/json',
      },
    });

    ctx.waitUntil(
      openNextWorker
        .fetch(req, env, ctx)
        .then(async (res) => {
          const body = await res.text();
          console.log(`[scheduled ${event.cron}] ${res.status} ${body.slice(0, 500)}`);
        })
        .catch((err) => {
          console.error(`[scheduled ${event.cron}] failed`, err);
        }),
    );
  },
};
