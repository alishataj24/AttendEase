import React, { useState, useEffect } from 'react';

// Simple pub/sub for toast events without needing to wrap the whole app
type ToastMsg = { id: number; message: string; type: 'success' | 'error' | 'info' };

let toastListeners: ((toast: ToastMsg) => void)[] = [];

export const addToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
  const toast: ToastMsg = { id: Date.now(), message, type };
  toastListeners.forEach(listener => listener(toast));
};

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastMsg[]>([]);

  useEffect(() => {
    const listener = (toast: ToastMsg) => {
      setToasts(prev => [...prev, toast]);
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== toast.id));
      }, 3000);
    };
    toastListeners.push(listener);
    return () => {
      toastListeners = toastListeners.filter(l => l !== listener);
    };
  }, []);

  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className="toast" style={{
          background: t.type === 'success' ? 'var(--success)' : t.type === 'error' ? 'var(--danger)' : 'var(--accent)',
          color: 'white'
        }}>
          {t.message}
        </div>
      ))}
    </div>
  );
};
