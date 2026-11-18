'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import Icon from './Icon';

const AlertContext = createContext(null);

const toneLabels = {
  success: 'Success',
  error: 'Something needs attention',
  warning: 'Please review',
  info: 'Notice',
};

export function AlertProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [dialog, setDialog] = useState(null);
  const cancelButtonRef = useRef(null);
  const restoreFocusRef = useRef(null);

  const notify = useCallback((message, type) => {
    const text = String(message);
    const resolvedType = type || (/\b(error|failed|failure|forbidden)\b/i.test(text)
      ? 'error'
      : /\b(successfully|success)\b/i.test(text)
        ? 'success'
        : /\b(please|invalid|required|warning|select at least)\b/i.test(text)
          ? 'warning'
          : 'info');
    const id = `${Date.now()}-${Math.random()}`;
    const toast = { id, message: text, type: resolvedType };
    setToasts((current) => [...current, toast]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== id));
    }, resolvedType === 'error' ? 7000 : 4800);
  }, []);

  const confirmAction = useCallback((message, options = {}) => new Promise((resolve) => {
    restoreFocusRef.current = document.activeElement;
    setDialog({
      message,
      title: options.title || 'Please confirm',
      confirmLabel: options.confirmLabel || 'Continue',
      cancelLabel: options.cancelLabel || 'Cancel',
      tone: options.tone || 'warning',
      resolve,
    });
  }), []);

  const closeDialog = useCallback((confirmed) => {
    setDialog((current) => {
      if (current) current.resolve(confirmed);
      return null;
    });
  }, []);

  useEffect(() => {
    if (dialog) {
      cancelButtonRef.current?.focus();
      return undefined;
    }
    restoreFocusRef.current?.focus?.();
    restoreFocusRef.current = null;
    return undefined;
  }, [dialog]);

  const value = useMemo(() => ({ notify, confirmAction }), [notify, confirmAction]);

  return (
    <AlertContext.Provider value={value}>
      {children}
      <div className="app-toast-stack" aria-label="Notifications">
        {toasts.map((toast) => (
          <div key={toast.id} className={`app-toast is-${toast.type}`} role={toast.type === 'error' ? 'alert' : 'status'}>
            <span className="app-toast-icon"><Icon name={toast.type === 'success' ? 'check' : toast.type === 'error' ? 'alert' : 'info'} size={18} /></span>
            <span className="app-toast-content"><strong>{toneLabels[toast.type] || toneLabels.info}</strong><span>{toast.message}</span></span>
            <button className="app-toast-close" type="button" onClick={() => setToasts((current) => current.filter((item) => item.id !== toast.id))} aria-label="Dismiss notification"><Icon name="close" size={16} /></button>
          </div>
        ))}
      </div>

      {dialog && (
        <div className="app-dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) closeDialog(false); }}>
          <section
            className={`app-confirm-dialog is-${dialog.tone}`}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="app-dialog-title"
            aria-describedby="app-dialog-description"
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.preventDefault();
                closeDialog(false);
              }
              if (event.key === 'Tab') {
                const buttons = event.currentTarget.querySelectorAll('button:not(:disabled)');
                const first = buttons[0];
                const last = buttons[buttons.length - 1];
                if (event.shiftKey && document.activeElement === first) {
                  event.preventDefault();
                  last.focus();
                } else if (!event.shiftKey && document.activeElement === last) {
                  event.preventDefault();
                  first.focus();
                }
              }
            }}
          >
            <span className="app-dialog-icon"><Icon name={dialog.tone === 'danger' ? 'trash' : dialog.tone === 'warning' ? 'alert' : 'info'} size={21} /></span>
            <h2 id="app-dialog-title">{dialog.title}</h2>
            <p id="app-dialog-description">{dialog.message}</p>
            <div className="app-dialog-actions">
              <button ref={cancelButtonRef} type="button" className="app-dialog-cancel" onClick={() => closeDialog(false)}>{dialog.cancelLabel}</button>
              <button type="button" className={`app-dialog-confirm${dialog.tone === 'danger' ? ' is-danger' : ''}`} onClick={() => closeDialog(true)}>{dialog.confirmLabel}</button>
            </div>
          </section>
        </div>
      )}
    </AlertContext.Provider>
  );
}

export function useAlerts() {
  const context = useContext(AlertContext);
  if (!context) throw new Error('useAlerts must be used within AlertProvider.');
  return context;
}
