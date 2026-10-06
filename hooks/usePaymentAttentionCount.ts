import { useEffect, useState } from 'react';
import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import { db as firestore } from '../firebase';
import {
    ACTIVE_NON_TERMINAL_STATUSES,
    countByCategory,
    PaymentTransactionLike
} from '../utils/paymentMonitor';

/**
 * Lightweight attention-count poller for the admin sidebar badge.
 *
 * Runs ONE auto-indexed single-field Firestore query (`status IN active`,
 * no composite index, no doc downloads beyond ~100 small docs) every
 * `intervalMs`, then classifies client-side with the same rules as the
 * Payment Monitor (stuck / mismatch / retrying). Intentionally polling —
 * NOT a realtime listener — to keep a permanent cost of ~1 query/minute.
 */
export function usePaymentAttentionCount(
    enabled: boolean,
    intervalMs: number = 60_000
): number {
    const [attention, setAttention] = useState(0);

    useEffect(() => {
        if (!enabled) {
            setAttention(0);
            return;
        }
        let cancelled = false;
        let timer: number | null = null;

        const poll = async () => {
            try {
                const q = query(
                    collection(firestore, 'paymentTransactions'),
                    where('status', 'in', [...ACTIVE_NON_TERMINAL_STATUSES]),
                    limit(100)
                );
                const snap = await getDocs(q);
                if (cancelled) return;
                const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() } as PaymentTransactionLike));
                setAttention(countByCategory(rows, Date.now()).attention);
            } catch {
                // Rules/network hiccup — keep showing the last known count.
            }
            if (!cancelled) {
                timer = window.setTimeout(poll, intervalMs);
            }
        };

        poll();
        return () => {
            cancelled = true;
            if (timer) window.clearTimeout(timer);
        };
    }, [enabled, intervalMs]);

    return attention;
}
