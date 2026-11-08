const fs = require('fs');
const path = 'c:/Users/86134/WorkBuddy/2026-09-06-15-38-30/gunfire-v2/index.html';
let s = fs.readFileSync(path, 'utf8');
let lines = s.split('\n');

// Find [start,end] line indices of a top-level function by brace matching.
function findFuncSpan(arr, name) {
  for (let i = 0; i < arr.length; i++) {
    if (arr[i].indexOf('function ' + name + '(') !== -1) {
      let depth = 0, started = false;
      for (let j = i; j < arr.length; j++) {
        const line = arr[j];
        for (let k = 0; k < line.length; k++) {
          const ch = line[k];
          if (ch === '{') { depth++; started = true; }
          else if (ch === '}') {
            depth--;
            if (started && depth === 0) return [i, j];
          }
        }
      }
    }
  }
  return null;
}

// Menu / overlay draw functions to restyle (fight view + already-ARENA home/login excluded).
const menuFns = [
  'drawResult', 'drawLevelSelect', 'drawFunLevelSelect', 'drawWeaponSelect',
  'drawShop', 'drawWarehouse', 'drawPause', 'drawDiffSelect', 'drawManual',
  'drawBag', 'drawDeathMenu', 'drawFriends', 'drawDuelRoom',
  'drawDuelInviteModal', 'drawMVP'
];

const hexMap = {
  '#07100a': '#16100e', '#0a1a12': '#16100e', '#0e1c0e': '#16100e', '#0c1a0c': '#16100e',
  '#0e2413': '#3a2418', '#102014': '#16100e', '#14260f': '#16100e', '#16331c': '#2a1814',
  '#1a1a14': '#16100e', '#1c3320': '#3a2c24', '#2c4a30': '#3a2c24', '#102030': '#16100e',
  '#1a1a2a': '#16100e', '#13202e': '#1a120c', '#1a2a3a': '#241812', '#243a52': '#3a2a1a',
  '#5aa0e0': '#e0a04a', '#3a5a7a': '#7a5a30', '#7fd0e0': '#e0a04a', '#cfe0ff': '#e8dcc8',
  '#24304a': '#3a2a1a', '#244': '#2a1814', '#242': '#2a1814', '#333': '#3a2c24',
  '#bdf': '#e8dcc8', '#0e1810': '#1a120c', '#0e1e12': '#1a120c'
};

function recolor(text) {
  // Backgrounds -> ARENA gradient + dirt
  text = text.split('ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);').join('arenaBg();');
  text = text.split("ctx.fillStyle = '#07100a'; ctx.fillRect(0, 0, VW, VH);").join('arenaBg();');
  text = text.split("ctx.fillStyle = '#0a1a12'; ctx.fillRect(0, 0, VW, VH);").join('arenaBg();');
  text = text.split("ctx.fillStyle = '#0e2413';").join("ctx.fillStyle = '#3a2418';");
  // Titles cream (must run BEFORE generic TH.green replacement)
  text = text.split(', TH.green, ').join(", '#f2efe8', ");
  // TH palette -> ARENA (greenD first so it is not swallowed by TH.green)
  text = text.split('TH.greenD').join("'#241812'");
  text = text.split('TH.green').join("'#e0523c'");
  text = text.split('TH.accent').join("'#e0a04a'");
  // literal green/blue/menu palette -> ARENA browns/golds
  for (const k in hexMap) text = text.split(k).join(hexMap[k]);
  return text;
}

const edits = [];
for (const fn of menuFns) {
  const span = findFuncSpan(lines, fn);
  if (!span) { console.log('NOT FOUND: ' + fn); continue; }
  const [start, end] = span;
  const orig = lines.slice(start, end + 1).join('\n');
  const recol = recolor(orig);
  if (recol !== orig) edits.push({ start, end, text: recol, fn });
  else console.log('UNCHANGED: ' + fn);
}

// Apply edits from bottom to top so indices stay valid.
for (let i = edits.length - 1; i >= 0; i--) {
  const e = edits[i];
  lines.splice(e.start, e.end - e.start + 1, e.text);
}

const out = lines.join('\n');
fs.writeFileSync(path, out);
console.log('Modified functions:');
for (const e of edits) {
  const ok = e.text.indexOf('function ' + e.fn + '(') === 0 || e.text.trim().indexOf('function ' + e.fn) === 0;
  console.log('  ' + e.fn + '  (lines ' + (e.end - e.start + 1) + ' -> ' + e.text.split('\n').length + ')' + (ok ? '' : '  <-- CHECK SPAN'));
}
console.log('Total functions changed: ' + edits.length);
