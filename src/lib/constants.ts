export const ISSUE_CATEGORIES = [
  { value: 'heating', label: 'Heizung' },
  { value: 'water_sanitary', label: 'Wasser / Sanitär' },
  { value: 'electricity', label: 'Strom' },
  { value: 'furniture', label: 'Möbel' },
  { value: 'kitchen_appliances', label: 'Küche / Geräte' },
  { value: 'windows_doors', label: 'Fenster / Türen' },
  { value: 'internet_wifi', label: 'Internet / WLAN' },
  { value: 'cleaning', label: 'Reinigung' },
  { value: 'other', label: 'Sonstiges' },
] as const;

export const ISSUE_STATUSES = [
  { value: 'new', label: 'Neu', className: 'status-new' },
  { value: 'received', label: 'Eingegangen', className: 'status-new' },
  { value: 'in_review', label: 'In Prüfung', className: 'status-progress' },
  { value: 'commissioned', label: 'Beauftragt', className: 'status-progress' },
  { value: 'in_progress', label: 'In Bearbeitung', className: 'status-progress' },
  { value: 'resolved', label: 'Erledigt', className: 'status-done' },
  { value: 'closed', label: 'Geschlossen', className: 'status-closed' },
] as const;

export const PRIORITIES = [
  { value: 'low', label: 'Niedrig', className: 'priority-low' },
  { value: 'medium', label: 'Mittel', className: 'priority-medium' },
  { value: 'high', label: 'Hoch', className: 'priority-high' },
  { value: 'urgent', label: 'Dringend', className: 'priority-urgent' },
] as const;

export const APARTMENT_STATUSES = [
  { value: 'available', label: 'Verfügbar' },
  { value: 'occupied', label: 'Belegt' },
  { value: 'maintenance', label: 'Wartung' },
  { value: 'inactive', label: 'Inaktiv' },
] as const;

export const TENANT_STATUSES = [
  { value: 'active', label: 'Aktiv' },
  { value: 'moved_out', label: 'Ausgezogen' },
  { value: 'paused', label: 'Pausiert' },
] as const;

export function getCategoryLabel(value: string): string {
  return ISSUE_CATEGORIES.find(c => c.value === value)?.label ?? value;
}

export function getStatusInfo(value: string) {
  return ISSUE_STATUSES.find(s => s.value === value) ?? { value, label: value, className: 'status-closed' };
}

export function getPriorityInfo(value: string) {
  return PRIORITIES.find(p => p.value === value) ?? { value, label: value, className: 'priority-medium' };
}
