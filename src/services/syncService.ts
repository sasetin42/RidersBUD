import { supabase, isSupabaseConfigured } from '../lib/supabase';

/**
 * Automated Sync Service
 * Provides automatic data synchronization between localStorage and Supabase
 * Ensures all data persists to database and syncs in realtime
 */

interface SyncQueueItem {
    table: string;
    operation: 'insert' | 'update' | 'delete';
    data: any;
    timestamp: number;
}

interface DataTypeConfig {
    name: string;
    table: string;
    primaryKey: string;
    userKey?: string;
    enableRealtime?: boolean;
    localStorageKey?: string;
}

export class SyncService {
    private static syncQueue: SyncQueueItem[] = [];
    private static isProcessing = false;
    private static registeredTypes: Map<string, DataTypeConfig> = new Map();

    /**
     * Register a new data type for automatic synchronization
     */
    static registerDataType(config: DataTypeConfig): void {
        this.registeredTypes.set(config.name, config);
        console.log(`[SyncService] Registered data type: ${config.name}`);
    }

    /**
     * Sync data to Supabase database
     */
    static async syncData(
        table: string,
        operation: 'insert' | 'update' | 'delete',
        data: any
    ): Promise<{ success: boolean; error?: Error }> {
        if (!isSupabaseConfigured()) {
            console.warn(`[SyncService] Supabase not configured, queuing operation for ${table}`);
            this.queueOperation(table, operation, data);
            return { success: false, error: new Error('Supabase not configured') };
        }

        try {
            let result;

            switch (operation) {
                case 'insert':
                    result = await supabase!.from(table).insert(data).select();
                    break;
                case 'update':
                    const { id, ...updateData } = data;
                    result = await supabase!.from(table).update(updateData).eq('id', id).select();
                    break;
                case 'delete':
                    result = await supabase!.from(table).delete().eq('id', data.id);
                    break;
            }

            if (result?.error) {
                throw result.error;
            }

            console.log(`[SyncService] Successfully synced ${operation} to ${table}`);
            return { success: true };
        } catch (error) {
            console.error(`[SyncService] Error syncing to ${table}:`, error);
            this.queueOperation(table, operation, data);
            return { success: false, error: error as Error };
        }
    }

    /**
     * Queue operation for retry when connection is restored
     */
    private static queueOperation(table: string, operation: 'insert' | 'update' | 'delete', data: any): void {
        this.syncQueue.push({
            table,
            operation,
            data,
            timestamp: Date.now()
        });

        // Limit queue size to prevent memory issues
        if (this.syncQueue.length > 100) {
            this.syncQueue.shift();
        }
    }

    /**
     * Process queued operations
     */
    static async processQueue(): Promise<void> {
        if (this.isProcessing || this.syncQueue.length === 0 || !isSupabaseConfigured()) {
            return;
        }

        this.isProcessing = true;
        console.log(`[SyncService] Processing ${this.syncQueue.length} queued operations`);

        const queue = [...this.syncQueue];
        this.syncQueue = [];

        for (const item of queue) {
            const result = await this.syncData(item.table, item.operation, item.data);
            if (!result.success) {
                // Re-queue failed operations
                this.syncQueue.push(item);
            }
        }

        this.isProcessing = false;
    }

    /**
     * Migrate data from localStorage to Supabase
     */
    static async migrateLocalStorage(userId: string): Promise<void> {
        if (!isSupabaseConfigured()) {
            console.warn('[SyncService] Cannot migrate: Supabase not configured');
            return;
        }

        console.log('[SyncService] Starting localStorage migration...');

        try {
            // Migrate cart
            const cartData = localStorage.getItem('ridersbud_cart');
            if (cartData) {
                const cart = JSON.parse(cartData);
                for (const item of cart) {
                    await this.syncData('cart_items', 'insert', {
                        customer_id: userId,
                        part_id: item.id,
                        quantity: item.quantity
                    });
                }
                console.log('[SyncService] Migrated cart items');
            }

            // Migrate wishlist
            const wishlistData = localStorage.getItem('wishlist');
            if (wishlistData) {
                const wishlist = JSON.parse(wishlistData);
                for (const item of wishlist) {
                    await this.syncData('wishlist_items', 'insert', {
                        customer_id: userId,
                        product_id: item.id,
                        product_type: 'category' in item ? 'service' : 'part'
                    });
                }
                console.log('[SyncService] Migrated wishlist items');
            }

            // Migrate reminders
            const remindersData = localStorage.getItem('serviceReminders');
            if (remindersData) {
                const reminders = JSON.parse(remindersData);
                for (const reminder of reminders) {
                    await this.syncData('service_reminders', 'insert', {
                        customer_id: userId,
                        service_name: reminder.serviceName,
                        date: reminder.date,
                        vehicle_make: reminder.vehicle?.split(' ')[0],
                        vehicle_model: reminder.vehicle?.split(' ')[1],
                        notes: reminder.notes
                    });
                }
                console.log('[SyncService] Migrated service reminders');
            }

            // Migrate warranties
            const warrantiesData = localStorage.getItem('serviceWarranties');
            if (warrantiesData) {
                const warranties = JSON.parse(warrantiesData);
                for (const warranty of warranties) {
                    await this.syncData('service_warranties', 'insert', {
                        customer_id: userId,
                        item_name: warranty.itemName,
                        purchase_date: warranty.purchaseDate,
                        expiry_date: warranty.expiryDate
                    });
                }
                console.log('[SyncService] Migrated service warranties');
            }

            console.log('[SyncService] Migration completed successfully');
        } catch (error) {
            console.error('[SyncService] Migration error:', error);
        }
    }

    /**
     * Clear localStorage after successful migration
     */
    static clearMigratedData(): void {
        const keysToRemove = [
            'ridersbud_cart',
            'wishlist',
            'serviceReminders',
            'serviceWarranties',
            'ridersbud_notifications'
        ];

        keysToRemove.forEach(key => {
            localStorage.removeItem(key);
        });

        console.log('[SyncService] Cleared migrated localStorage data');
    }

    /**
     * Setup automatic queue processing
     */
    static startAutoSync(intervalMs: number = 30000): void {
        setInterval(() => {
            this.processQueue();
        }, intervalMs);

        console.log(`[SyncService] Auto-sync started (interval: ${intervalMs}ms)`);
    }

    /**
     * Check if migration is needed
     */
    static needsMigration(): boolean {
        const keys = ['ridersbud_cart', 'wishlist', 'serviceReminders', 'serviceWarranties'];
        return keys.some(key => localStorage.getItem(key) !== null);
    }
}

// Start auto-sync on module load
if (typeof window !== 'undefined') {
    SyncService.startAutoSync();
}
