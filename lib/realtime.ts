import { supabase } from './supabaseClient';

export function subscribeToSession(sessionId: string, handlers: {
  onPick?: (row: any)=>void;
  onUndo?: (overall: number)=>void; // we’ll emulate via delete+recalc later if needed
  onSession?: (row: any)=>void;
}) {
  const channel = supabase
    .channel(`draft:${sessionId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'picks',
      filter: `session_id=eq.${sessionId}`
    }, (payload) => {
      handlers.onPick?.(payload.new);
    })
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'sessions',
      filter: `id=eq.${sessionId}`
    }, (payload) => {
      handlers.onSession?.(payload.new);
    })
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}
