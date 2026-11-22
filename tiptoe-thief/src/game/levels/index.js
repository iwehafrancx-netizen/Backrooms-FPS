// Every heist in play order. Areas group them on the heist map.
import suburbs from './suburbs.js';
import apartments from './apartments.js';
import mansion from './mansion.js';

export const LEVELS = [...suburbs, ...apartments, ...mansion];
