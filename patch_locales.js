const fs = require('fs');
const path = require('path');
const base = path.join('C:', 'ai-capitalS-mvp', 'frontend', 'lib', 'locales');
const patches = [
  ['ru.ts', "stockExchange: '\u0424\u043e\u043d\u0434\u043e\u0432\u0430\u044f \u0431\u0438\u0440\u0436\u0430',", "stockExchange: '\u0424\u043e\u043d\u0434\u043e\u0432\u0430\u044f \u0431\u0438\u0440\u0436\u0430',\n      calculator: '\u041a\u0430\u043b\u044c\u043a\u0443\u043b\u044f\u0442\u043e\u0440',"],
  ['en.ts', "stockExchange: 'Stock Exchange',", "stockExchange: 'Stock Exchange',\n      calculator: 'Calculator',"],
  ['uz.ts', "stockExchange: 'Fond birjasi',", "stockExchange: 'Fond birjasi',\n      calculator: 'Kalkulyator',"],
];
for (const [file, old, nw] of patches) {
  const fp = path.join(base, file);
  if (!fs.existsSync(fp)) { console.log('SKIP ' + file); continue; }
  let t = fs.readFileSync(fp, 'utf8');
  if (t.includes('calculator:')) { console.log(file + ' already done'); continue; }
  if (t.includes(old)) { fs.writeFileSync(fp, t.replace(old, nw)); console.log(file + ' PATCHED'); }
  else console.log(file + ' WARNING: marker not found');
}
console.log('DONE');
