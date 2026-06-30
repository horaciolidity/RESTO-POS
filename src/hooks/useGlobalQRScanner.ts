import { useEffect, useRef, useCallback } from 'react';
import { useOrdersStore } from '../store/useOrdersStore';

const SCANNER_SPEED_THRESHOLD_MS = 80; // chars arriving faster than this = scanner input
const SCAN_COMPLETE_DELAY_MS = 150; // wait this long after last char to process

interface ScannerConfig {
  enabled: boolean;
}

function getConfig(): ScannerConfig {
  try {
    const raw = localStorage.getItem('hardware_config');
    if (raw) {
      const parsed = JSON.parse(raw);
      return { enabled: parsed.scannerEnabled !== false };
    }
  } catch {}
  return { enabled: true };
}

let toastTimeout: ReturnType<typeof setTimeout> | null = null;

function showToast(message: string, type: 'success' | 'error' = 'success') {
  // Remove existing toast
  const existingToast = document.getElementById('qr-scanner-toast');
  if (existingToast) existingToast.remove();
  if (toastTimeout) clearTimeout(toastTimeout);

  const toast = document.createElement('div');
  toast.id = 'qr-scanner-toast';
  toast.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 9999;
    padding: 14px 20px;
    border-radius: 14px;
    font-family: system-ui, sans-serif;
    font-size: 13px;
    font-weight: 700;
    color: white;
    background: ${type === 'success' ? 'linear-gradient(135deg, #059669, #10b981)' : 'linear-gradient(135deg, #dc2626, #ef4444)'};
    box-shadow: 0 8px 24px rgba(0,0,0,0.3);
    display: flex;
    align-items: center;
    gap: 8px;
    animation: slideInToast 0.25s ease-out;
    max-width: 340px;
  `;

  // Inject animation if not already present
  if (!document.getElementById('toast-style')) {
    const style = document.createElement('style');
    style.id = 'toast-style';
    style.textContent = `
      @keyframes slideInToast {
        from { transform: translateY(20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }

  toast.innerHTML = `
    <span style="font-size:18px">${type === 'success' ? '✅' : '❌'}</span>
    <span>${message}</span>
  `;
  document.body.appendChild(toast);

  toastTimeout = setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(() => toast.remove(), 350);
  }, 3500);
}

export function useGlobalQRScanner() {
  const bufferRef = useRef('');
  const lastKeyTimeRef = useRef(0);
  const processTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { updateOrderStatus, orders } = useOrdersStore();

  const processBuffer = useCallback(async (raw: string) => {
    bufferRef.current = '';

    // Extract the order ID from URL patterns like:
    // http://localhost:5173/scan/uuid-here
    // or just uuid-here directly
    let orderId: string | null = null;

    const urlMatch = raw.match(/\/scan\/([0-9a-f-]{36})/i);
    if (urlMatch) {
      orderId = urlMatch[1];
    } else if (/^[0-9a-f-]{36}$/i.test(raw.trim())) {
      // Bare UUID
      orderId = raw.trim();
    }

    if (!orderId) return; // Not a recognized QR, ignore

    // Find the order to get its number for feedback
    const order = orders.find(o => o.id === orderId);

    try {
      await updateOrderStatus(orderId, 'listo');
      const turnNum = order?.orderNumber ?? '–';
      showToast(`Turno #${turnNum} marcado como LISTO para retirar`, 'success');
    } catch (err) {
      showToast('Error al procesar el QR. Intente manualmente.', 'error');
    }
  }, [updateOrderStatus, orders]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const config = getConfig();
      if (!config.enabled) return;

      // Ignore if user is typing in an input/textarea/select
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      const now = Date.now();
      const timeSinceLastKey = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      // If this key arrived much later than the threshold — reset buffer
      if (timeSinceLastKey > 1000 && bufferRef.current.length > 0) {
        bufferRef.current = '';
      }

      if (e.key === 'Enter') {
        // Scanner finished sending the code
        if (processTimerRef.current) clearTimeout(processTimerRef.current);
        const buf = bufferRef.current;
        if (buf.length > 6) {
          processBuffer(buf);
        }
        bufferRef.current = '';
        return;
      }

      // Only accumulate printable chars that arrive fast (scanner-speed)
      if (e.key.length === 1 && timeSinceLastKey < SCANNER_SPEED_THRESHOLD_MS) {
        bufferRef.current += e.key;

        if (processTimerRef.current) clearTimeout(processTimerRef.current);
        processTimerRef.current = setTimeout(() => {
          const buf = bufferRef.current;
          if (buf.length > 6) {
            processBuffer(buf);
          }
          bufferRef.current = '';
        }, SCAN_COMPLETE_DELAY_MS);
      } else if (e.key.length === 1) {
        // First character of a new potential scan
        bufferRef.current = e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [processBuffer]);
}
