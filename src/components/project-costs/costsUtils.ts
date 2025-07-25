import { supabase } from '@/lib/supabase/client';

export async function getCostsByType(projectId: string, type: 'Capex' | 'Opex') {
  const { data, error } = await supabase
    .from('costs_data')
    .select('*')
    .eq('project_id', projectId)
    .eq('cost_type', type)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data;
} 