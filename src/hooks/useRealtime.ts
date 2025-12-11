import { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

interface UseRealtimeOptions<T> {
    table: string;
    event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
    filter?: string;
    onInsert?: (payload: T) => void;
    onUpdate?: (payload: T) => void;
    onDelete?: (payload: { old: T }) => void;
    onChange?: (payload: any) => void;
}

/**
 * Custom hook for subscribing to realtime changes on a Supabase table
 * 
 * @example
 * ```tsx
 * const { data, loading, error } = useRealtime<Booking>({
 *   table: 'bookings',
 *   event: '*',
 *   onChange: (payload) => console.log('Change:', payload)
 * });
 * ```
 */
export function useRealtime<T = any>(options: UseRealtimeOptions<T>) {
    const [channel, setChannel] = useState<RealtimeChannel | null>(null);
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        if (!isSupabaseConfigured()) {
            console.warn('Supabase not configured, realtime disabled');
            return;
        }

        const { table, event = '*', filter, onInsert, onUpdate, onDelete, onChange } = options;

        // Create channel
        const channelName = `${table}-${event}-${Date.now()}`;
        const realtimeChannel = supabase!
            .channel(channelName)
            .on(
                'postgres_changes',
                {
                    event,
                    schema: 'public',
                    table,
                    filter,
                },
                (payload) => {
                    console.log(`[Realtime] ${table} ${payload.eventType}:`, payload);

                    // Call specific handlers
                    if (payload.eventType === 'INSERT' && onInsert) {
                        onInsert(payload.new as T);
                    } else if (payload.eventType === 'UPDATE' && onUpdate) {
                        onUpdate(payload.new as T);
                    } else if (payload.eventType === 'DELETE' && onDelete) {
                        onDelete({ old: payload.old as T });
                    }

                    // Call generic change handler
                    if (onChange) {
                        onChange(payload);
                    }
                }
            )
            .subscribe((status) => {
                console.log(`[Realtime] ${table} subscription status:`, status);

                if (status === 'SUBSCRIBED') {
                    setIsSubscribed(true);
                } else if (status === 'CHANNEL_ERROR') {
                    setError(new Error(`Failed to subscribe to ${table}`));
                } else if (status === 'TIMED_OUT') {
                    setError(new Error(`Subscription to ${table} timed out`));
                }
            });

        setChannel(realtimeChannel);

        // Cleanup
        return () => {
            console.log(`[Realtime] Unsubscribing from ${table}`);
            realtimeChannel.unsubscribe();
            setIsSubscribed(false);
        };
    }, [options.table, options.event, options.filter]);

    return {
        channel,
        isSubscribed,
        error,
    };
}

/**
 * Hook for subscribing to multiple tables at once
 */
export function useRealtimeMulti(tables: string[]) {
    const [channels, setChannels] = useState<RealtimeChannel[]>([]);
    const [subscribedTables, setSubscribedTables] = useState<string[]>([]);

    useEffect(() => {
        if (!isSupabaseConfigured()) {
            return;
        }

        const newChannels: RealtimeChannel[] = [];

        tables.forEach((table) => {
            const channel = supabase!
                .channel(`${table}-multi-${Date.now()}`)
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table },
                    (payload) => {
                        console.log(`[Realtime Multi] ${table}:`, payload);
                    }
                )
                .subscribe((status) => {
                    if (status === 'SUBSCRIBED') {
                        setSubscribedTables((prev) => [...prev, table]);
                    }
                });

            newChannels.push(channel);
        });

        setChannels(newChannels);

        return () => {
            newChannels.forEach((channel) => channel.unsubscribe());
            setSubscribedTables([]);
        };
    }, [tables.join(',')]);

    return {
        channels,
        subscribedTables,
        allSubscribed: subscribedTables.length === tables.length,
    };
}

/**
 * Hook for presence tracking (who's online)
 */
export function usePresence(roomName: string, userId: string, metadata?: any) {
    const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
    const [channel, setChannel] = useState<RealtimeChannel | null>(null);

    useEffect(() => {
        if (!isSupabaseConfigured() || !userId) {
            return;
        }

        const presenceChannel = supabase!.channel(roomName, {
            config: {
                presence: {
                    key: userId,
                },
            },
        });

        presenceChannel
            .on('presence', { event: 'sync' }, () => {
                const state = presenceChannel.presenceState();
                const users = Object.values(state).flat();
                setOnlineUsers(users);
            })
            .on('presence', { event: 'join' }, ({ newPresences }) => {
                console.log('[Presence] User joined:', newPresences);
            })
            .on('presence', { event: 'leave' }, ({ leftPresences }) => {
                console.log('[Presence] User left:', leftPresences);
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await presenceChannel.track({
                        userId,
                        onlineAt: new Date().toISOString(),
                        ...metadata,
                    });
                }
            });

        setChannel(presenceChannel);

        return () => {
            presenceChannel.unsubscribe();
        };
    }, [roomName, userId, metadata]);

    return {
        onlineUsers,
        channel,
        isOnline: onlineUsers.length > 0,
    };
}
