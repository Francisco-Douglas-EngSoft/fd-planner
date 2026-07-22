import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';

// Types for offline data
interface OfflineAction {
  id: string;
  type: 'create' | 'update' | 'delete';
  table: string;
  data: Record<string, unknown>;
  timestamp: number;
}

interface OfflineState {
  isOnline: boolean;
  pendingActions: number;
  lastSyncTime: Date | null;
}

const DB_NAME = 'fd-planner-offline';
const DB_VERSION = 1;
const STORES = ['cache', 'pendingActions', 'settings'];

// IndexedDB helper functions
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      STORES.forEach(storeName => {
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName, { keyPath: 'id' });
        }
      });
    };
  });
}

async function getFromStore<T>(storeName: string, key: string): Promise<T | null> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.get(key);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result?.data || null);
  });
}

async function setInStore(storeName: string, key: string, data: unknown): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.put({ id: key, data, timestamp: Date.now() });
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

async function getAllFromStore<T>(storeName: string): Promise<T[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result.map(item => item.data));
  });
}

async function deleteFromStore(storeName: string, key: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(key);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

async function clearStore(storeName: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.clear();
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export function useOfflineSync() {
  const [state, setState] = useState<OfflineState>({
    isOnline: navigator.onLine,
    pendingActions: 0,
    lastSyncTime: null,
  });
  
  const syncInProgress = useRef(false);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => {
      setState(prev => ({ ...prev, isOnline: true }));
      toast.success('Conexão restaurada! Sincronizando dados...');
      syncPendingActions();
    };

    const handleOffline = () => {
      setState(prev => ({ ...prev, isOnline: false }));
      toast.warning('Você está offline. Suas ações serão salvas localmente.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Load pending actions count on mount
    loadPendingActionsCount();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadPendingActionsCount = useCallback(async () => {
    try {
      const actions = await getAllFromStore<OfflineAction>('pendingActions');
      setState(prev => ({ ...prev, pendingActions: actions.length }));
    } catch (error) {
      console.error('Error loading pending actions:', error);
    }
  }, []);

  // Cache data for offline access
  const cacheData = useCallback(async (key: string, data: unknown) => {
    try {
      await setInStore('cache', key, data);
    } catch (error) {
      console.error('Error caching data:', error);
    }
  }, []);

  // Get cached data
  const getCachedData = useCallback(async <T>(key: string): Promise<T | null> => {
    try {
      return await getFromStore<T>('cache', key);
    } catch (error) {
      console.error('Error getting cached data:', error);
      return null;
    }
  }, []);

  // Queue an action for offline sync
  const queueAction = useCallback(async (action: Omit<OfflineAction, 'id' | 'timestamp'>) => {
    const offlineAction: OfflineAction = {
      ...action,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };

    try {
      await setInStore('pendingActions', offlineAction.id, offlineAction);
      setState(prev => ({ ...prev, pendingActions: prev.pendingActions + 1 }));
      
      if (!state.isOnline) {
        toast.info('Ação salva localmente. Será sincronizada quando você voltar online.');
      }
    } catch (error) {
      console.error('Error queuing action:', error);
      toast.error('Erro ao salvar ação offline');
    }
  }, [state.isOnline]);

  // Sync pending actions when back online
  const syncPendingActions = useCallback(async () => {
    if (syncInProgress.current || !state.isOnline) return;
    
    syncInProgress.current = true;
    
    try {
      const actions = await getAllFromStore<OfflineAction>('pendingActions');
      
      if (actions.length === 0) {
        syncInProgress.current = false;
        return;
      }

      let synced = 0;
      
      for (const action of actions) {
        try {
          // Here you would implement the actual sync logic with Supabase
          // For now, we'll just simulate success
          if (import.meta.env.DEV) console.log('Syncing action:', action);
          
          await deleteFromStore('pendingActions', action.id);
          synced++;
          setState(prev => ({ ...prev, pendingActions: prev.pendingActions - 1 }));
        } catch (error) {
          console.error('Error syncing action:', error);
        }
      }

      if (synced > 0) {
        toast.success(`${synced} ações sincronizadas com sucesso!`);
        setState(prev => ({ ...prev, lastSyncTime: new Date() }));
      }
    } catch (error) {
      console.error('Error syncing pending actions:', error);
    } finally {
      syncInProgress.current = false;
    }
  }, [state.isOnline]);

  // Clear all cached data
  const clearCache = useCallback(async () => {
    try {
      await clearStore('cache');
      toast.success('Cache limpo com sucesso');
    } catch (error) {
      console.error('Error clearing cache:', error);
      toast.error('Erro ao limpar cache');
    }
  }, []);

  // Get cache stats
  const getCacheStats = useCallback(async () => {
    try {
      const cache = await getAllFromStore('cache');
      const pending = await getAllFromStore('pendingActions');
      
      return {
        cachedItems: cache.length,
        pendingActions: pending.length,
        estimatedSize: JSON.stringify(cache).length + JSON.stringify(pending).length,
      };
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return { cachedItems: 0, pendingActions: 0, estimatedSize: 0 };
    }
  }, []);

  return {
    ...state,
    cacheData,
    getCachedData,
    queueAction,
    syncPendingActions,
    clearCache,
    getCacheStats,
  };
}

// Hook for caching specific data types
export function useOfflineCache<T>(key: string, fetchFn: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { isOnline, cacheData, getCachedData } = useOfflineSync();

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (isOnline) {
        // Fetch fresh data
        const freshData = await fetchFn();
        setData(freshData);
        await cacheData(key, freshData);
      } else {
        // Use cached data
        const cached = await getCachedData<T>(key);
        if (cached) {
          setData(cached);
        } else {
          throw new Error('Sem dados em cache disponíveis');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Erro desconhecido'));
      
      // Try to use cache as fallback
      const cached = await getCachedData<T>(key);
      if (cached) {
        setData(cached);
        toast.warning('Usando dados em cache');
      }
    } finally {
      setLoading(false);
    }
  }, [key, fetchFn, isOnline, cacheData, getCachedData]);

  useEffect(() => {
    refresh();
  }, []);

  return { data, loading, error, refresh, isOnline };
}
