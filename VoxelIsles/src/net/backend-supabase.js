import { RealtimeClient } from '@supabase/realtime-js';
import { NET } from './config.js';

export function supabaseBackend(id) {
  const client = new RealtimeClient(NET.url.replace(/^http/, 'ws') + '/realtime/v1', { params: { apikey: NET.key, eventsPerSecond: 40 }, heartbeatIntervalMs: 15000 });
  return {
    kind: 'supabase',
    open(name) {
      const ch = client.channel(name, { config: { broadcast: { self: false }, presence: { key: id } } });
      const h = {};
      let sync = () => {};
      ch.on('broadcast', { event: 'm' }, ({ payload }) => { const f = payload && h[payload.e]; if (f) f(payload.d); });
      ch.on('presence', { event: 'sync' }, () => sync());
      const ready = new Promise((res, rej) => ch.subscribe((s) => { if (s === 'SUBSCRIBED') res(); else if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT' || s === 'CLOSED') rej(new Error(s)); }));
      ready.catch(() => {});
      return {
        ready,
        on(e, f) { h[e] = f; },
        send(e, d) { ch.send({ type: 'broadcast', event: 'm', payload: { e, d } }).catch(() => {}); },
        track(s) { return ch.track(s).catch(() => {}); },
        untrack() { return ch.untrack().catch(() => {}); },
        members() { return Object.values(ch.presenceState()).map((l) => l[0]).filter(Boolean); },
        onSync(f) { sync = f; },
        close() { client.removeChannel(ch).catch(() => {}); },
      };
    },
  };
}
