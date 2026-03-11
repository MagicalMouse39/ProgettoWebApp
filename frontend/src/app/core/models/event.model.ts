export interface EventType {
  id: string;
  name: string;
  color_hex?: string;
  description?: string;
}

export interface HorseEvent {
  id: string;
  horse_id: string;
  type_id: string;
  scheduled_date: string;
  completion_date?: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  notes?: string;
  created_at?: string;
  updated_at?: string;

  horses?: { name: string };
  event_type?: EventType;
}
