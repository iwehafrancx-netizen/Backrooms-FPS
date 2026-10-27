export function localBackend(id) {
  return {
    kind: 'local',
    open(name) {
      const bc = new BroadcastChannel('vi:' + name), h = {}, mem = new Map();
      let mine = null, sync = () => {}, closed = false;
      bc.onmessage = ({ data: m }) => {
        if (m.k === 'b') { const f = h[m.e]; if (f) f(m.d); }
        else if (m.k === 'p') { if (m.s) mem.set(m.from, { s: m.s, t: performance.now() }); else mem.delete(m.from); sync(); }
        else if (m.k === 'q' && mine) bc.postMessage({ k: 'p', from: id, s: mine });
      };
      const hb = setInterval(() => {
        if (mine) bc.postMessage({ k: 'p', from: id, s: mine });
        const n = performance.now();
        let gone = false;
        for (const [k, v] of mem) if (n - v.t > 3200) { mem.delete(k); gone = true; }
        if (gone) sync();
      }, 1000);
      bc.postMessage({ k: 'q' });
      return {
        ready: new Promise((r) => setTimeout(r, 30)),
        on(e, f) { h[e] = f; },
        send(e, d) { if (!closed) bc.postMessage({ k: 'b', e, d }); },
        track(s) { mine = s; bc.postMessage({ k: 'p', from: id, s }); sync(); },
        untrack() { mine = null; if (!closed) bc.postMessage({ k: 'p', from: id, s: null }); },
        members() { const out = [...mem.values()].map((v) => v.s); if (mine) out.push(mine); return out; },
        onSync(f) { sync = f; },
        close() { if (closed) return; if (mine) bc.postMessage({ k: 'p', from: id, s: null }); closed = true; clearInterval(hb); bc.close(); },
      };
    },
  };
}
