// 把 gunimg/*.png 以 base64 dataURL 内嵌进 index.html，插在 var WEAPONS 之前
const fs = require('fs');
const path = require('path');
const DIR = __dirname;
const KEYS = ['pistol', 'shotgun', 'mg', 'rocket', 'sniper', 'smg', 'rifle'];

let block = '// ===== 像素武器贴图（用户截图抠图内嵌，商城卡片 + 战斗手持共用）=====\n';
block += 'var GUN_IMG = { pistol: new Image(), shotgun: new Image(), mg: new Image(), rocket: new Image(), sniper: new Image(), smg: new Image(), rifle: new Image() };\n';
for (const k of KEYS) {
  const b = fs.readFileSync(path.join(DIR, 'gunimg', k + '.png'));
  block += `GUN_IMG.${k}.src = 'data:image/png;base64,${b.toString('base64')}';\n`;
}
block += "var GUN_LEN = { pistol: 16, shotgun: 24, mg: 27, rocket: 25, sniper: 26, smg: 21, rifle: 24 }; // 手持贴图长度（像素）\n";

const htmlPath = path.join(DIR, 'index.html');
let s = fs.readFileSync(htmlPath, 'utf8');
if (s.indexOf('GUN_IMG') >= 0) { console.log('ALREADY_EMBEDDED'); process.exit(0); }
const anchor = 'var WEAPONS = {';
if (s.indexOf(anchor) < 0) { console.log('ANCHOR_NOT_FOUND'); process.exit(1); }
s = s.replace(anchor, block + anchor);
fs.writeFileSync(htmlPath, s);
console.log('EMBEDDED_OK, html size =', s.length);
