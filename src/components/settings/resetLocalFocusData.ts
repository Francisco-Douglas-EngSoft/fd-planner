// Clears all client-side study/focus state so a database reset isn't undone
// by the offline focus queue re-syncing pending sessions or a persisted timer.
const LOCAL_FOCUS_KEYS = [
  'fdplanner_pending_focus_sessions_v1', // offline queue (would re-insert sessions!)
  'fdplanner_sent_focus_cids_v1',
  'fdplanner_focus_flush_lock_v1',
  'fdplanner_pomodoro_state', // active/paused timer state
];

export function resetLocalFocusData() {
  try {
    for (const key of LOCAL_FOCUS_KEYS) {
      localStorage.removeItem(key);
    }
  } catch (e) {
    console.error('Failed to clear local focus data', e);
  }
}
