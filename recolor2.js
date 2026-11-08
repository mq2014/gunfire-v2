const fs = require('fs');
const path = 'c:/Users/86134/WorkBuddy/2026-09-06-15-38-30/gunfire-v2/index.html';
let lines = fs.readFileSync(path, 'utf8').split('\n');

// Verified function spans (0-based inclusive) from diag.js (all braces balanced).
const SPANS = {
  drawDeathMenu: [895, 913],
  drawBag: [1420, 1542],
  drawDiffSelect: [2739, 2764],
  drawDiffRow: [2723, 2737],
  drawResult: [2900, 2939],
  drawLevelSelect: [2940, 2976],
  drawFunLevelSelect: [2978, 3009],
  drawWeaponSelect: [3011, 3061],
  drawShop: [3063, 3196],
  drawWarehouse: [3199, 3361],
  drawPause: [3370, 3383],
  drawManual: [3596, 3614],
  drawFriends: [3937, 4270],
  drawDuelRoom: [4632, 4671],
  drawDuelInviteModal: [4674, 4692],
  drawMVP: [4693, 4700]
};

// Quoted hex color literals -> ARENA brown/red/gold (exact-string replace, safe).
const hexMap = [
  ["'#07100a'", "'#16100e'"],
  ["'#0e1c0e'", "'#16100e'"],
  ["'#0e1810'", "'#16100e'"],
  ["'#0a1a12'", "'#16100e'"],
  ["'#0a1410'", "'#16100e'"],
  ["'#102014'", "'#16100e'"],
  ["'#102030'", "'#16100e'"],
  ["'#13202e'", "'#16100e'"],
  ["'#1a1a14'", "'#16100e'"],
  ["'#1a1a2a'", "'#16100e'"],
  ["'#14260f'", "'#1a120e'"],
  ["'#242'", "'#1a120e'"],
  ["'#333'", "'#1a120e'"],
  ["'#1c3320'", "'#241812'"],
  ["'#16331c'", "'#241812'"],
  ["'#244'", "'#241812'"],
  ["'#1a2a3a'", "'#241812'"],
  ["'#1d3a22'", "'#241812'"],
  ["'#24304a'", "'#241812'"],
  ["'#1a1410'", "'#241812'"],
  ["'#2c4a30'", "'#3a2c24'"],
  ["'#3a5a7a'", "'#3a2c24'"],
  ["'#243a52'", "'#3a2c24'"],
  ["'#7fd0e0'", "'#e0a04a'"],
  ["'#5aa0e0'", "'#e0a04a'"],
  ["'#bdf'", "'#e0a04a'"],
  ["'#a05a4a'", "'#6a4038'"],
  ["'#cfe0ff'", "'#f2efe8'"],
  ["'#8fa07a'", "'#9a948a'"],
  ["'#a8b894'", "'#9a948a'"],
  ["'#b8c8a0'", "'#9a948a'"],
  ["'#cfe0bc'", "'#9a948a'"],
  ["'#7f9a6a'", "'#9a948a'"],
  ["'#6a8a5a'", "'#6a645c'"]
];

// Match the FIRST full-screen background fill in a function (solid hex | rgba overlay | gradient block).
const bgRe = /(?:ctx\.fillStyle\s*=\s*'#[0-9a-fA-F]{3,6}'\s*;\s*ctx\.fillRect\(\s*0\s*,\s*0\s*,\s*VW\s*,\s*VH\s*\);)|(?:ctx\.fillStyle\s*=\s*'rgba\([^']*\)'\s*;\s*ctx\.fillRect\(\s*0\s*,\s*0\s*,\s*VW\s*,\s*VH\s*\);)|(?:var\s+g\s*=\s*ctx\.createLinearGradient[\s\S]*?ctx\.fillStyle\s*=\s*g;\s*ctx\.fillRect\(\s*0\s*,\s*0\s*,\s*VW\s*,\s*VH\s*\);)/;

const results = [];
for (const name in SPANS) {
  const [s, e] = SPANS[name];
  let slice = lines.slice(s, e + 1).join('\n');

  let bgCount = 0;
  slice = slice.replace(bgRe, function () { bgCount++; return 'arenaBg();'; });

  for (const [from, to] of hexMap) {
    if (slice.indexOf(from) !== -1) slice = slice.split(from).join(to);
  }
  // TH.* tokens: used as UNQUOTED values (txt(..., TH.green, ...)), so replacement MUST keep quotes.
  // greenD must be replaced before green.
  slice = slice.replace(/TH\.greenD/g, "'#241812'");
  slice = slice.replace(/TH\.green/g, "'#e0a04a'");
  slice = slice.replace(/TH\.red/g, "'#e0523c'");
  slice = slice.replace(/TH\.gold/g, "'#e0a04a'");
  slice = slice.replace(/TH\.accent/g, "'#e0a04a'");

  results.push({ name, s, e, newLines: slice.split('\n'), bgCount });
}

// Apply splices bottom-up so earlier line indices stay valid.
results.sort((a, b) => b.s - a.s);
for (const r of results) {
  const { s, e, newLines, name, bgCount } = r;
  lines.splice(s, e - s + 1, ...newLines);
  console.log(name + ': bgReplaced=' + bgCount + ' linesBefore=' + (e - s + 1) + ' linesAfter=' + newLines.length);
}

fs.writeFileSync(path, lines.join('\n'));
console.log('DONE');
