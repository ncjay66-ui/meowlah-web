#!/usr/bin/env python3
"""
make-icons.py
-------------
从品牌主图 brand/logo-master.png 生成全套站点图标。

为什么不直接把整张 logo 当 favicon：
  主图是一枚金色圆形徽章，里面有 "MEOWLAH.COM / MALAYSIA / NUTRISI & GRED"
  三行字。Google 搜索结果里的站点图标实际只渲染到 16-32px —— 那三行字在这个
  尺寸下会糊成一团灰点，反而比没有图标更难认。

  所以分两套用途：
    · favicon / app icon  → 只取中间的猫头，放在深色圆底上。
      深色底是必须的：金色在白底上对比度很低，而 Google 搜索结果页
      （尤其深色模式）本身就是浅/深底，白底金线会直接糊掉。
    · og-image            → 用完整徽章，因为分享卡片有 1200x630 的空间，
      徽章上的字在那个尺寸是看得清的。

用法：
    python -X utf8 scripts/make-icons.py

输出（全部写进 public/，favicon.ico 另外复制一份到 src/app/）：
    favicon.ico           16 / 32 / 48 三尺寸
    icon.png              192x192   （PWA + <link rel=icon>）
    icon-512.png          512x512   （PWA maskable / Google 结构化数据 logo）
    apple-touch-icon.png  180x180
    og-image.png          1200x630  （WhatsApp / FB / X 分享卡片）
    logo.png              1024x1024 完整徽章，透明底，给 Organization JSON-LD 用
"""

from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "brand" / "logo-master.png"
PUB = ROOT / "public"
APP = ROOT / "src" / "app"

# 主图里徽章圆心与半径（量出来的，换图要重新量）
BADGE_CX, BADGE_CY, BADGE_R = 543.5, 496.0, 458
# 猫头在主图里的裁切框
CAT_BOX = (340, 185, 750, 528)

# 深色底：比纯黑柔和一点，在 Google 深色模式下不会和背景糊在一起
DISC_BG = (18, 22, 30)
RIM = (201, 162, 74)


def load() -> Image.Image:
    if not SRC.exists():
        raise SystemExit(f"找不到主图：{SRC}")
    return Image.open(SRC).convert("RGBA")


def badge_transparent(im: Image.Image, size: int) -> Image.Image:
    """完整徽章，圆形之外切成透明。"""
    box = (
        int(BADGE_CX - BADGE_R), int(BADGE_CY - BADGE_R),
        int(BADGE_CX + BADGE_R), int(BADGE_CY + BADGE_R),
    )
    cut = im.crop(box).resize((size, size), Image.LANCZOS)
    mask = Image.new("L", (size * 4, size * 4), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, size * 4 - 1, size * 4 - 1), fill=255)
    cut.putalpha(mask.resize((size, size), Image.LANCZOS))
    return cut


def cat_icon(im: Image.Image, size: int) -> Image.Image:
    """猫头 + 深色圆底 + 细金边。4 倍超采样再缩，小尺寸下边缘才不会锯齿。"""
    s = size * 4
    canvas = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(canvas)
    d.ellipse((0, 0, s - 1, s - 1), fill=DISC_BG + (255,))
    # 16px 下金边会把猫头挤没，直接不画；大尺寸才画细边
    rim_w = 0 if size <= 16 else max(2, int(s * 0.016))
    if rim_w:
        d.ellipse((rim_w, rim_w, s - 1 - rim_w, s - 1 - rim_w),
                  outline=RIM + (255,), width=rim_w)

    cat = im.crop(CAT_BOX).convert("RGBA")
    # 把猫头周围的白/浅底抠掉，只留金线
    px = cat.load()
    w, h = cat.size
    for y in range(h):
        for x in range(w):
            r, g, b, _ = px[x, y]
            warmth = r - b
            if warmth < 22 and r > 150:        # 近白的大理石底
                px[x, y] = (r, g, b, 0)
            elif warmth < 45:                   # 半过渡，按暖度给羽化
                px[x, y] = (r, g, b, int(255 * max(0.0, (warmth - 22) / 23)))

    inner = int(s * (0.90 if size <= 16 else 0.80))
    cw = inner
    ch = int(inner * cat.size[1] / cat.size[0])
    cat = cat.resize((cw, ch), Image.LANCZOS)
    canvas.alpha_composite(cat, ((s - cw) // 2, (s - ch) // 2))
    return canvas.resize((size, size), Image.LANCZOS)


def og_image(im: Image.Image) -> Image.Image:
    W, H = 1200, 630
    card = Image.new("RGBA", (W, H), DISC_BG + (255,))
    d = ImageDraw.Draw(card)
    # 顶部一条金线，分享卡片缩略图里也能一眼认出是同一个品牌
    d.rectangle((0, 0, W, 6), fill=RIM + (255,))
    badge = badge_transparent(im, 460)
    card.alpha_composite(badge, ((W - 460) // 2, (H - 460) // 2 - 10))
    return card


def main() -> None:
    im = load()
    PUB.mkdir(parents=True, exist_ok=True)

    # ⚠️ 只能写 src/app/favicon.ico，不能同时在 public/ 放一份：
    #    App Router 会把 src/app/favicon.ico 编译成 /favicon.ico 路由，
    #    public/favicon.ico 会和它撞车，next build 直接报
    #    "A conflicting public file and page file was found"。
    ico_sizes = [16, 32, 48]
    frames = [cat_icon(im, n) for n in ico_sizes]
    ico_path = APP / "favicon.ico"
    frames[-1].save(ico_path, format="ICO",
                    sizes=[(n, n) for n in ico_sizes],
                    append_images=frames[:-1])
    stale = PUB / "favicon.ico"
    if stale.exists():
        try:
            stale.unlink()
        except OSError:
            print(f"  [!] 请手动删除 {stale} —— 它会让 next build 失败")

    cat_icon(im, 192).save(PUB / "icon.png")
    cat_icon(im, 512).save(PUB / "icon-512.png")
    cat_icon(im, 180).save(PUB / "apple-touch-icon.png")
    # Google 对 Organization.logo 只要求 >=112px；1024 的 PNG 有 1.2MB，纯属浪费带宽
    badge_transparent(im, 512).save(PUB / "logo.png", optimize=True)
    og_image(im).convert("RGB").save(PUB / "og-image.png", optimize=True)

    for p in sorted(PUB.glob("*.png")) + [ico_path]:
        print(f"  {p.name:<24} {p.stat().st_size // 1024:>4} KB")


if __name__ == "__main__":
    main()
