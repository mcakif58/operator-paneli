import { db } from './db';
import { supabase } from './supabase';

export const NetworkManager = {
    isOnline: () => navigator.onLine,

    addToQueue: async (table, action, data) => {
        try {
            await db.offline_queue.add({
                table,
                action,
                data,
                created_at: new Date().toISOString()
            });
            console.log('Offline: Data queued', { table, action });
            return true;
        } catch (error) {
            console.error('Failed to queue offline data:', error);
            return false;
        }
    },

    processQueue: async (onStatusChange) => {
        if (!navigator.onLine) return;

        const count = await db.offline_queue.count();
        if (count === 0) return;

        if (onStatusChange) onStatusChange('SYNCING');

        const queue = await db.offline_queue.toArray();

        // Sort by created_at to preserve order
        queue.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

        for (const item of queue) {
            try {
                let error = null;

                if (item.action === 'INSERT') {
                    const { error: err } = await supabase.from(item.table).insert(item.data);
                    error = err;
                } else if (item.action === 'STOP_PRODUCTION') {
                    const { machine_id, operator_id, bitis, sebep } = item.data;

                    // Find active session to close
                    const { data: session, error: findError } = await supabase
                        .from('durus_loglari')
                        .select('id')
                        .eq('machine_id', machine_id)
                        .eq('operator_id', operator_id)
                        .is('bitis', null)
                        .order('baslangic', { ascending: false })
                        .limit(1)
                        .single();

                    if (session) {
                        const { error: updateError } = await supabase
                            .from('durus_loglari')
                            .update({ bitis, sebep })
                            .eq('id', session.id);
                        error = updateError;
                    } else if (findError && findError.code !== 'PGRST116') {
                        error = findError;
                    }
                }

                if (!error) {
                    await db.offline_queue.delete(item.id);
                } else {
                    console.error('Sync Warning: Could not sync item, will retry later.', item, error);
                }
            } catch (err) {
                console.error('Sync Critical Error:', err);
            }
        }

        if (onStatusChange) onStatusChange('ONLINE');
    }
};
