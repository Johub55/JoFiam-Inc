export interface ToastMessage {
  id: string;
  message: string;
  type?: 'info' | 'success' | 'error' | 'warning';
  duration?: number;
}

type ToastListener = (toasts: ToastMessage[]) => void;

let activeToasts: ToastMessage[] = [];
const listeners: Set<ToastListener> = new Set();

export const showToast = (message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info', duration = 4000) => {
  const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const newToast: ToastMessage = { id, message, type, duration };
  
  activeToasts = [...activeToasts, newToast];
  notifyListeners();

  if (duration > 0) {
    setTimeout(() => {
      dismissToast(id);
    }, duration);
  }
};

export const dismissToast = (id: string) => {
  activeToasts = activeToasts.filter(t => t.id !== id);
  notifyListeners();
};

export const subscribeToasts = (listener: ToastListener) => {
  listeners.add(listener);
  listener(activeToasts);
  return () => {
    listeners.delete(listener);
  };
};

const notifyListeners = () => {
  listeners.forEach(fn => fn(activeToasts));
};

/**
 * Universal safe in-app replacement for native browser alert()
 */
export const appAlert = (message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') => {
  showToast(message, type, 4500);
};
