import { t } from '../../i18n/strings.js';
import { TEAM_COLORS } from '../../engine/blocks.js';

export const clock = (s) => { s = Math.max(0, Math.ceil(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
export const teamName = (i) => t('team_' + i);
export const teamColor = (i) => (TEAM_COLORS[i] ? TEAM_COLORS[i].hex : '#ffffff');

export function teamResult(m, me, scoreText) {
  const win = m.over && m.winner === me.team;
  const sub = m.winner == null ? t('draw') : win ? t('teamWins', { team: teamName(me.team) }) : t('teamWins', { team: teamName(m.winner) });
  return { win, rank: win ? 1 : 2, total: 2, sub: scoreText ? `${sub} · ${scoreText}` : sub };
}

export function kit(a, items) { a.inv.clear(); for (const [id, n] of items) a.inv.add(id, n); a.sel = 0; }

export function spawnAt(a, s, protect = 2) {
  a.reset(); a.alive = true; a.eliminated = false;
  a.pos.x = s.x; a.pos.y = s.y; a.pos.z = s.z;
  a.yaw = s.yaw ?? a.yaw; a.pitch = -0.08; a.spawnProtect = protect;
}
