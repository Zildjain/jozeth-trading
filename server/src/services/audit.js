import { Activity } from '../models/index.js';
import { makeId, todayISO } from '../utils/ids.js';

export async function audit({ title, description = '', tone = 'blue', actor = 'System' }, session) {
  const row = new Activity({ id: makeId('ACT'), title, description, date: todayISO(), tone, actor });
  await row.save(session ? { session } : undefined);
  return row;
}
