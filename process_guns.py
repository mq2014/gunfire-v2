# -*- coding: utf-8 -*-
# 处理用户提供的 7 张像素枪截图：缩放 -> 边缘泛洪抠背景 -> 裁剪 -> 保存 PNG
from PIL import Image
from collections import deque
import os

SRC = r"C:\Users\86134\.workbuddy\clipboard-images"
OUT = r"c:\Users\86134\WorkBuddy\2026-09-06-15-38-30\gunfire-v2\gunimg"
os.makedirs(OUT, exist_ok=True)

# 外观映射：截图文件 -> 武器键
FILES = {
    'pistol':  'clipboard-2026-10-11T09-10-27-202Z-f2ad3209.png',  # 手枪
    'rifle':   'clipboard-2026-10-11T09-10-27-204Z-0495ecd4.png',  # 突击步枪（提把+木护木）
    'smg':     'clipboard-2026-10-11T09-10-27-206Z-53d3efa8.png',  # 冲锋枪（黑色导轨）
    'rocket':  'clipboard-2026-10-11T09-10-27-209Z-1cac8be0.png',  # 火箭筒（沙色消音）
    'mg':      'clipboard-2026-10-11T09-10-27-211Z-1cac8be0.png',  # 机枪（与火箭筒同图，用户可再换）
    'sniper':  'clipboard-2026-10-11T09-10-27-212Z-1d147bec.png',  # 狙击枪（黑色长枪）
    'shotgun': 'clipboard-2026-10-11T09-10-27-214Z-99b58ee4.png',  # 霰弹枪（全木护木）
}

T_BG = 46   # 与背景色的总距离阈值
T_NB = 14   # 与相邻像素的距离阈值（应对渐变暗角）

for key, fname in FILES.items():
    im = Image.open(os.path.join(SRC, fname)).convert('RGBA')
    w, h = im.size
    nw = 240
    im = im.resize((nw, round(h * nw / w)), Image.LANCZOS)
    px = im.load()
    W, H = im.size
    cs = [px[0, 0], px[W - 1, 0], px[0, H - 1], px[W - 1, H - 1]]
    bg = tuple(sum(c[i] for c in cs) // 4 for i in range(3))

    def near_bg(p):
        return abs(p[0] - bg[0]) + abs(p[1] - bg[1]) + abs(p[2] - bg[2]) <= T_BG

    def near_each(a, b):
        return abs(a[0] - b[0]) + abs(a[1] - b[1]) + abs(a[2] - b[2]) <= T_NB

    seen = [[False] * W for _ in range(H)]
    q = deque()
    # 先把四边里接近背景色的入队（记录来源像素颜色用于局部渐变判断）
    for x in range(W):
        for y in (0, H - 1):
            if near_bg(px[x, y]):
                seen[y][x] = True; q.append((x, y, px[x, y]))
    for y in range(H):
        for x in (0, W - 1):
            if near_bg(px[x, y]) and not seen[y][x]:
                seen[y][x] = True; q.append((x, y, px[x, y]))
    while q:
        x, y, c = q.popleft()
        px[x, y] = (0, 0, 0, 0)
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < W and 0 <= ny < H and not seen[ny][nx]:
                p = px[nx, ny]
                if near_bg(p) or near_each(c, p):
                    seen[ny][nx] = True
                    q.append((nx, ny, p))
    bbox = im.getbbox()
    im = im.crop(bbox)
    out = os.path.join(OUT, key + '.png')
    im.save(out, optimize=True)
    print(key, im.size, os.path.getsize(out), 'bytes')
