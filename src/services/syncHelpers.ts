import type { Order, OrderStatus } from '../types';

/**
 * Optimistic mutation lock tracker.
 * Prevents cloud polling or cross-tab echoes from overwriting freshly changed statuses or items.
 */
export const pendingOrderMutations = new Map<number, {
  status?: OrderStatus;
  items?: any[];
  isPrio?: boolean;
  timestamp: number;
}>();

export const recentlyDeletedOrders = new Map<number, number>();

export function recordLocalOrderMutation(
  orderNo: number,
  mutation: { status?: OrderStatus; items?: any[]; isPrio?: boolean }
) {
  const existing = pendingOrderMutations.get(orderNo);
  pendingOrderMutations.set(orderNo, {
    ...existing,
    ...mutation,
    timestamp: Date.now()
  });
}

export function recordDeletedOrder(orderNo: number) {
  recentlyDeletedOrders.set(orderNo, Date.now());
  pendingOrderMutations.delete(orderNo);
}

export function clearLocalOrderMutation(orderNo: number) {
  pendingOrderMutations.delete(orderNo);
}

/**
 * Format an order raw record from Supabase into our strongly-typed Order object.
 */
export const formatDbOrder = (o: any): Order => {
  let parsedItems = [];
  if (typeof o.items === 'string') {
    try {
      parsedItems = JSON.parse(o.items);
    } catch {
      parsedItems = [];
    }
  } else if (Array.isArray(o.items)) {
    parsedItems = o.items;
  }

  let parsedMeta: any = {};
  if (typeof o.payment_meta === 'string') {
    try {
      parsedMeta = JSON.parse(o.payment_meta);
    } catch {
      parsedMeta = {};
    }
  } else if (typeof o.payment_meta === 'object' && o.payment_meta !== null) {
    parsedMeta = o.payment_meta;
  }

  const createdDate = o.created_at ? new Date(o.created_at) : new Date();
  const updatedDate = o.updated_at ? new Date(o.updated_at) : createdDate;

  return {
    id: o.id || Date.now(),
    no: Number(o.order_no),
    items: parsedItems,
    total: Number(o.total || 0),
    discount: Number(o.discount || 0),
    orderType: (o.order_type as any) || 'dine_in',
    identifier: o.identifier || '',
    notes: o.notes || '',
    paymentMethod: (o.payment_method as any) || 'workpay',
    paymentMeta: parsedMeta,
    cashier: o.cashier || 'Kassa',
    status: (o.status as OrderStatus) || 'new',
    isPrio: Boolean(o.is_prio ?? parsedMeta?.isPrio ?? false),
    time: createdDate.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }),
    timestamp: createdDate.getTime(),
    updatedAt: updatedDate.getTime()
  };
};

/**
 * Intelligently merge remote orders with local orders without glitching or bouncing back.
 * - Protects recent local status changes from being overwritten by stale cloud polling.
 * - Prevents ghost reappearance of recently deleted orders.
 * - Respects timestamps and optimistic locks.
 */
export const mergeOrders = (
  current: Order[],
  incoming: Order[]
): { merged: Order[]; hasNewRemoteOrder: boolean } => {
  let hasNewRemoteOrder = false;
  const now = Date.now();
  const currentMap = new Map<number, Order>();
  current.forEach(o => currentMap.set(o.no, o));

  const result: Order[] = [];
  const processedNos = new Set<number>();

  for (const inc of incoming) {
    // 1. If this order was deleted locally within the last 20 seconds, reject stale remote row
    const deletedTime = recentlyDeletedOrders.get(inc.no);
    if (deletedTime && now - deletedTime < 20000) {
      continue;
    }

    processedNos.add(inc.no);
    const exist = currentMap.get(inc.no);

    if (!exist) {
      // Discovered a genuine new order from another terminal/kiosk
      hasNewRemoteOrder = true;
      result.push(inc);
    } else {
      // Check for pending local mutations within protection window (15s)
      const localMutation = pendingOrderMutations.get(inc.no);
      const isMutationFresh = localMutation && now - localMutation.timestamp < 15000;

      // Status resolution: if locally mutated, NEVER let older remote poll overwrite it!
      let resolvedStatus = exist.status;
      if (isMutationFresh && localMutation.status) {
        resolvedStatus = localMutation.status;
      } else if (inc.status && inc.status !== exist.status) {
        // If remote has a genuine newer update timestamp, accept it; otherwise keep local
        if (inc.updatedAt && exist.updatedAt && inc.updatedAt > exist.updatedAt) {
          resolvedStatus = inc.status;
        } else if (!exist.updatedAt) {
          resolvedStatus = inc.status;
        }
      }

      // Items resolution: keep locally updated stages if mutated recently
      let resolvedItems = exist.items;
      if (isMutationFresh && localMutation.items) {
        resolvedItems = localMutation.items;
      } else if (inc.items && inc.items.length > 0) {
        if (inc.updatedAt && exist.updatedAt && inc.updatedAt > exist.updatedAt) {
          resolvedItems = inc.items;
        } else {
          resolvedItems = exist.items.length > 0 ? exist.items : inc.items;
        }
      }

      // Prio resolution: local toggle takes precedence
      const resolvedPrio = isMutationFresh && localMutation.isPrio !== undefined
        ? localMutation.isPrio
        : (exist.isPrio ?? inc.isPrio ?? false);

      result.push({
        ...inc,
        ...exist,
        status: resolvedStatus,
        items: resolvedItems,
        isPrio: resolvedPrio,
        updatedAt: Math.max(exist.updatedAt || exist.timestamp || 0, inc.updatedAt || inc.timestamp || 0)
      });
    }
  }

  // Keep any optimistic local orders that have not yet arrived from Supabase
  for (const exist of current) {
    if (!processedNos.has(exist.no)) {
      const deletedTime = recentlyDeletedOrders.get(exist.no);
      if (!deletedTime || now - deletedTime >= 20000) {
        result.push(exist);
      }
    }
  }

  // Sort descending by order number (latest first)
  result.sort((a, b) => b.no - a.no);

  return { merged: result, hasNewRemoteOrder };
};

/**
 * Universal cross-tab BroadcastChannel wrapper
 */
export const broadcastSync = (type: string, payload: any) => {
  if (typeof window === 'undefined') return;
  try {
    if ('BroadcastChannel' in window) {
      const ch = new BroadcastChannel('wd_unified_sync_channel');
      ch.postMessage({ type, payload, timestamp: Date.now() });
      ch.close();
    }
  } catch (err) {
    console.debug('BroadcastChannel post error:', err);
  }
};
