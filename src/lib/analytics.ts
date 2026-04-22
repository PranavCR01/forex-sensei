import { supabase } from '@/lib/supabase'

type EventType =
  | 'trade_logged'
  | 'trade_closed'
  | 'headline_decoded'
  | 'chart_uploaded'
  | 'tour_started'
  | 'tour_completed'
  | 'page_viewed'

export async function logEvent(
  eventType: EventType,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  try {
    await supabase.from('events').insert({
      event_type: eventType,
      metadata,
    })
  } catch {
    // Analytics must never break the app — fail silently always
  }
}
