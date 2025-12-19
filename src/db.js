import Dexie from 'dexie';

export const db = new Dexie('OpPanelDB');

db.version(1).stores({
    offline_queue: '++id, table, action, data, created_at'
});
