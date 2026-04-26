/**
 * One-off / repeatable fix for UTF-8 mojibake in app/(tabs)/settings.tsx
 * Run from my-app: node scripts/fix-settings-mojibake.js
 */
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'app', '(tabs)', 'settings.tsx');
let s = fs.readFileSync(file, 'utf8');

const pairs = [
  // Residual 4-byte garbage (soft hyphen + Latin-1 misread tail)
  ['\u00AD\u0192\u00C5\u00D1', '🏥'],
  ['\u00AD\u0192\u00F6\u00FF', '📋'],
  // Longer / composed sequences first
  ["'­ƒæ¿ÔÇìÔÜò´©Å'", "'👨‍⚕️'"],
  ["'­ƒæ®ÔÇìÔÜò´©Å'", "'👩‍⚕️'"],
  ['ÔÜá´©Å', '⚠️'],
  ['Ô£ë´©Å', '✉️'],
  ['Ô£Å´©Å', '✏️'],
  ['ÔÜÖ´©Å', '⚙️'],
  ['ÔØñ´©Å', '❤️'],
  ['ÔÿÇ´©Å', '☀️'],
  ['Ô¡É ', '⭐ '],
  // Spanish UTF-8-as-latin1 style (├ + continuation)
  ['├í', 'á'],
  ['├®', 'é'],
  ['├¡', 'í'],
  ['├│', 'ó'],
  ['├║', 'ú'],
  ['├▒', 'ñ'],
  ['├ü', 'Á'],
  ['├ì', 'Í'],
  ['├ô', 'Ó'],
  ['├Ü', 'Ú'],
  ['├ë', 'É'],
  // Inverted punctuation
  ['┬┐', '¿'],
  ['┬í', '¡'],
  // Common mojibake symbols
  ['ÔÇó', '•'],
  ['Ô£à', '✅'],
  ['ÔØî', '❌'],
  ['Ôÿò ', '☕ '],
  ['ÔÅ░ ', '⏰ '],
];

// Broken emoji prefixes (UTF-8 emoji read as Latin-1); map to real emoji
const emojiMap = {
  '­ƒÄ¡': '🎬',
  '­ƒÄ»': '🎯',
  '­ƒÄë': '🎉',
  '­ƒÅå': '🏥',
  '­ƒÆ¥': '💎',
  '­ƒÆ│': '💳',
  '­ƒÜ½': '🚫',
  '­ƒÜÇ': '🚀',
  '­ƒåò': '🆕',
  '­ƒæ®': '👩',
  '­ƒæ¿': '👨',
  '­ƒæñ': '👤',
  '­ƒîÉ': '🌐',
  '­ƒîÖ': '🌙',
  '­ƒòÉ': '🕐',
  '­ƒôº': '📧',
  '­ƒôÑ': '📥',
  '­ƒô×': '📞',
  '­ƒôØ': '📝',
  '­ƒôà': '📅',
  '­ƒôè': '📊',
  '­ƒôì': '📍',
  '­ƒôï': '📋',
  '­ƒôñ': '📤',
  '­ƒô▒': '📱',
  '­ƒöº': '🔧',
  '­ƒöä': '🔄',
  '­ƒöì': '🔍',
  '­ƒöØ': '🔘',
  '­ƒö┤': '🔴',
  '­ƒùæ': '🗑️',
  '­ƒƒ¢': '🟢',
  '­ƒƒó': '🟢',
};

for (const [bad, good] of pairs) {
  s = s.split(bad).join(good);
}
for (const [bad, good] of Object.entries(emojiMap)) {
  s = s.split(bad).join(good);
}

fs.writeFileSync(file, s, 'utf8');
console.log('Updated', file);
