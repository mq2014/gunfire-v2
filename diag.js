const fs = require('fs');
const path = 'c:/Users/86134/WorkBuddy/2026-09-06-15-38-30/gunfire-v2/index.html';
let lines = fs.readFileSync(path, 'utf8').split('\n');

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

const menuFns = [
  'drawResult', 'drawLevelSelect', 'drawFunLevelSelect', 'drawWeaponSelect',
  'drawShop', 'drawWarehouse', 'drawPause', 'drawDiffSelect', 'drawManual',
  'drawBag', 'drawDeathMenu', 'drawFriends', 'drawDuelRoom',
  'drawDuelInviteModal', 'drawMVP'
];

for (const fn of menuFns) {
  const s = findFuncSpan(lines, fn);
  if (!s) { console.log(fn + ': NOT FOUND'); continue; }
  const text = lines.slice(s[0], s[1] + 1).join('\n');
  const opens = (text.match(/{/g) || []).length;
  const closes = (text.match(/}/g) || []).length;
  console.log(fn + ': start=' + s[0] + ' end=' + s[1] + ' len=' + (s[1]-s[0]+1) + ' braces=' + opens + '/' + closes + (text.indexOf('function ' + fn + '(') === 0 ? ' OK' : ' BAD-HEADER'));
}
