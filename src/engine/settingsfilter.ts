export type SettingsSection = 'daily' | 'appearance' | 'sound' | 'catching' | 'keyboard' | 'save' | 'about';

export interface SettingsSectionDef {
  id: SettingsSection;
  title: string;
  keywords: string[];       // what people type when they mean this section
}

export const SETTINGS_SECTIONS: SettingsSectionDef[] = [
  { id: 'daily', title: 'Daily quest reset', keywords: ['daily', 'quest', 'reset', 'midnight', 'utc', 'local', 'time', 'timezone', 'clock', 'day', 'rollover'] },
  { id: 'appearance', title: 'Appearance', keywords: ['appearance', 'theme', 'dark', 'light', 'mode', 'colour', 'color', 'look', 'night', 'day', 'system'] },
  { id: 'sound', title: 'Sound', keywords: ['sound', 'audio', 'sfx', 'effects', 'volume', 'mute', 'music', 'vibration', 'haptic', 'buzz', 'vibrate'] },
  { id: 'catching', title: 'Catching', keywords: ['catch', 'catching', 'sphere', 'policy', 'throw', 'merchant', 'auto'] },
  { id: 'keyboard', title: 'Keyboard', keywords: ['keyboard', 'shortcuts', 'hotkeys', 'keys', 'rebind', 'binding', 'bindings', 'controls', 'remap'] },
  { id: 'save', title: 'Save', keywords: ['save', 'export', 'import', 'backup', 'transfer', 'copy', 'clipboard', 'reset game', 'delete', 'wipe', 'restart', 'autosave', 'storage', 'browser'] },
  { id: 'about', title: 'About', keywords: ['about', 'version', 'build', 'changelog', "what's new", 'whats new', 'update', 'tutorial', 'help', 'replay', 'how to play', 'steps', 'guide'] },
];

/** Sections whose title or keywords match every word of the query (empty query = all). */
export function filterSettings(query: string, sections: SettingsSectionDef[] = SETTINGS_SECTIONS): SettingsSectionDef[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return sections;
  return sections.filter((s) => {
    const hay = [s.title, ...s.keywords].join(' ').toLowerCase();
    return words.every((w) => hay.includes(w));
  });
}
