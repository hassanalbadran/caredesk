'use strict';
const day = (on, open = '09:00', close = '17:00') => ({ on, open, close });
const DEFAULTS = {
  lang: 'ar',
  theme: 'system',            // system | light | dark | sand | ocean
  customCursor: true,
  reduceMotion: false,
  fontScale: 1,
  countryCode: '964',
  currency: 'IQD',
  slotStep: 15,
  // Working hours per weekday (0=Sunday .. 6=Saturday). Friday differs by default (closed).
  hours: { 0: day(true), 1: day(true), 2: day(true), 3: day(true), 4: day(true), 5: day(false, '09:00', '13:00'), 6: day(true) },
  // Absence handling
  absenceWarnAfter: 3,        // consecutive missed sessions => flagged as "dropped-out risk" (منقطع)
  absenceRemoveAfter: 5,      // consecutive missed sessions => remove future bookings
  lateTagPolicy: 'late_slots',// patients with tag effect 'late_slots' get late slots automatically
  backgroundOnMinimize: false, // minimise to tray and keep running
  backgroundOnClose: false,
  sounds: true,
  autoTags: true,             // laggard / committed tags are given automatically (manual tags are never touched)
  laggardMisses: 2,           // misses within the last 8 sessions => laggard
  committedStreak: 6,         // consecutive attended sessions => committed
  timerWarnMin: 2,
  sessionPatterns: [],        // recent drag-and-drop session patterns (max 12)
  ratingApi: { enabled: false, base: '', token: '' },
  ratingBase: '',             // public rating-form base URL (set when the form is published)
  reminderGapMin: 15,         // buffer shown next to times in reminder lists
  clinic: { name: '', logo: '', doctors: [], phones: [], socials: [] },
  eclinic: { enabled: false, path: '', table: '', map: {} },
  printer: { name: '', paper: 'A5', customW: 80, customH: 200 },
  receipt: null,              // layout filled by receipt designer (null => built-in default)
  msg: {
    ar: {
      reminder: 'مرحباً {title} {name}،\nهذه رسالة تذكيرية لكم بموعد جلساتكم القادمة والتي ستكون كالآتي:\n{sessions}\n\n{clinic}',
      call: 'هلا والله {title} {name}، شلونك؟ شلون صحتك وشخبارك؟ نتمنى تكون زين وبخير إن شاء الله. بس حبينا نتطمن عليك ونذكرك بموعد جلستك الجاية، يوم {date} الساعة {time}. نتشرف بيك دايماً.',
      titleM: 'السيد', titleF: 'السيدة'
    },
    en: {
      reminder: 'Hello {title} {name},\nThis is a reminder of your upcoming sessions:\n{sessions}\n\n{clinic}',
      call: 'Hello {title} {name}, how are you doing? We just wanted to check on you and remind you of your next session on {date} at {time}. We look forward to seeing you.',
      titleM: 'Mr.', titleF: 'Ms.'
    }
  },
  sessionLine: '- {type}: {date} — {time}'
};
const DEFAULT_TAGS = [
  { name: 'منقطع', name_en: 'Dropped-out risk', tone: 'neg', effect: 'dropout', system: 1, color: '#c0504d' },
  { name: 'متلكئ', name_en: 'Often late', tone: 'neg', effect: 'late_slots', system: 1, color: '#d89b3c' },
  { name: 'ملتزم', name_en: 'Committed', tone: 'pos', effect: 'committed', system: 1, color: '#2f9e6b' },
  { name: 'VIP', name_en: 'VIP', tone: 'pos', effect: 'vip', system: 1, color: '#4a7fb5' },
  { name: 'إدامة', name_en: 'Maintenance', tone: 'pos', effect: 'maintenance', system: 1, color: '#7b6bb5' }
];
const ROLES = ['secretary', 'admin', 'manager', 'god'];
const PERMS = ['view_today', 'mark_attendance', 'add_patient', 'edit_patient', 'delete_patient', 'view_calendar', 'view_stats', 'use_tools', 'print', 'view_income', 'reschedule', 'cancel_session', 'settings_look', 'manage_settings', 'manage_staff', 'backup', 'import_export', 'diagnostics', 'view_audit'];
const ROLE_PERMS = {
  secretary: ['view_today', 'mark_attendance', 'add_patient', 'edit_patient', 'reschedule', 'view_calendar', 'use_tools', 'print', 'settings_look'],
  admin: PERMS.filter((p) => !['manage_staff', 'view_audit'].includes(p)),
  manager: PERMS, god: PERMS
};
module.exports = { DEFAULTS, DEFAULT_TAGS, ROLES, PERMS, ROLE_PERMS };
