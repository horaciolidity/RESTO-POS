/**
 * tableCallService.ts
 * Manages real-time waiter call notifications via Supabase Realtime Broadcast.
 * No extra database table needed — uses ephemeral broadcast channels.
 */

import { supabase, isSupabaseConfigured } from './supabase';

export interface TableCallEvent {
  tableToken: string;
  tableNumber: number;
  tableId: string;
  branchId: string;
  calledAt: string;
}

export interface TableCallConfirmEvent {
  tableToken: string;
  tableNumber: number;
  waiterName: string;
  confirmedAt: string;
}

let callSubscription: any = null;
let confirmSubscription: any = null;

export const tableCallService = {
  /**
   * Client calls the waiter. Broadcasts to the branch channel.
   */
  async callWaiter(event: Omit<TableCallEvent, 'calledAt'>): Promise<void> {
    if (!isSupabaseConfigured()) {
      // Demo mode: use BroadcastChannel (same tab/window only)
      const bc = new BroadcastChannel('mesa_hub_calls');
      bc.postMessage({ type: 'TABLE_CALL', ...event, calledAt: new Date().toISOString() });
      bc.close();
      return;
    }

    await supabase.channel(`branch-${event.branchId}-calls`)
      .send({
        type: 'broadcast',
        event: 'TABLE_CALL',
        payload: { ...event, calledAt: new Date().toISOString() }
      });
  },

  /**
   * Waiter confirms they received the call. Client page listens for this.
   */
  async confirmCall(event: Omit<TableCallConfirmEvent, 'confirmedAt'>, branchId: string): Promise<void> {
    if (!isSupabaseConfigured()) {
      const bc = new BroadcastChannel('mesa_hub_calls');
      bc.postMessage({ type: 'TABLE_CALL_CONFIRM', ...event, confirmedAt: new Date().toISOString() });
      bc.close();
      return;
    }

    await supabase.channel(`branch-${branchId}-calls`)
      .send({
        type: 'broadcast',
        event: 'TABLE_CALL_CONFIRM',
        payload: { ...event, confirmedAt: new Date().toISOString() }
      });
  },

  /**
   * Waiter subscribes to incoming table calls for their branch.
   * Returns the channel so it can be unsubscribed.
   */
  subscribeToTableCalls(
    branchId: string,
    onCall: (event: TableCallEvent) => void,
    onConfirmSent?: (event: TableCallConfirmEvent) => void
  ) {
    if (!isSupabaseConfigured()) {
      // Demo mode fallback
      const bc = new BroadcastChannel('mesa_hub_calls');
      bc.onmessage = (msg) => {
        if (msg.data?.type === 'TABLE_CALL') onCall(msg.data as TableCallEvent);
      };
      return bc;
    }

    const channel = supabase
      .channel(`branch-${branchId}-calls`)
      .on('broadcast', { event: 'TABLE_CALL' }, ({ payload }) => {
        onCall(payload as TableCallEvent);
      })
      .on('broadcast', { event: 'TABLE_CALL_CONFIRM' }, ({ payload }) => {
        if (onConfirmSent) onConfirmSent(payload as TableCallConfirmEvent);
      })
      .subscribe();

    callSubscription = channel;
    return channel;
  },

  /**
   * Client page subscribes to confirmation that waiter acknowledged the call.
   */
  subscribeToConfirmations(
    branchId: string,
    tableToken: string,
    onConfirm: (event: TableCallConfirmEvent) => void
  ) {
    if (!isSupabaseConfigured()) {
      const bc = new BroadcastChannel('mesa_hub_calls');
      bc.onmessage = (msg) => {
        if (msg.data?.type === 'TABLE_CALL_CONFIRM' && msg.data?.tableToken === tableToken) {
          onConfirm(msg.data as TableCallConfirmEvent);
        }
      };
      return bc;
    }

    const channel = supabase
      .channel(`branch-${branchId}-confirms-${tableToken}`)
      .on('broadcast', { event: 'TABLE_CALL_CONFIRM' }, ({ payload }) => {
        if ((payload as TableCallConfirmEvent).tableToken === tableToken) {
          onConfirm(payload as TableCallConfirmEvent);
        }
      })
      .subscribe();

    confirmSubscription = channel;
    return channel;
  },

  unsubscribeAll() {
    if (callSubscription) {
      supabase.removeChannel(callSubscription);
      callSubscription = null;
    }
    if (confirmSubscription) {
      supabase.removeChannel(confirmSubscription);
      confirmSubscription = null;
    }
  },

  /**
   * Play an alarm sound using Web Audio API (no audio file needed).
   */
  playAlarm() {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      const playBeep = (startTime: number, freq: number, dur: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0.3, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + dur);
        osc.start(startTime);
        osc.stop(startTime + dur);
      };

      // 3 short urgent beeps
      playBeep(ctx.currentTime, 880, 0.15);
      playBeep(ctx.currentTime + 0.2, 1100, 0.15);
      playBeep(ctx.currentTime + 0.4, 880, 0.15);
      playBeep(ctx.currentTime + 0.6, 1100, 0.15);
      playBeep(ctx.currentTime + 0.8, 880, 0.3);
    } catch (e) {
      console.warn('Could not play alarm:', e);
    }
  },

  /**
   * Vibrate the device (works on mobile).
   */
  vibrate() {
    try {
      if ('vibrate' in navigator) {
        navigator.vibrate([400, 100, 400, 100, 600]);
      }
    } catch (e) {
      console.warn('Vibration not supported:', e);
    }
  }
};
