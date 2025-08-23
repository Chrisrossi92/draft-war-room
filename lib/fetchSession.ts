import { supabase } from './supabaseClient';

export async function fetchSession(sessionId: string) {
  const { data: session, error } = await supabase.from('sessions').select('*').eq('id', sessionId).single();
  if (error) throw error;
  const { data: teams } = await supabase.from('teams').select('*').eq('session_id', sessionId).order('slot');
  const { data: picks } = await supabase
    .from('picks')
    .select('*')
    .eq('session_id', sessionId)
    .order('overall');
  return { session, teams: teams ?? [], picks: picks ?? [] };
}
