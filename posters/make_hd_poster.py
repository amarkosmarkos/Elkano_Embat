"""Recompose approved V5 at 4800x7200 using externally supplied Topaz 4x still.

No API calls or generative tools. Ship detail comes from the supplied upscale;
type and footer marks are rendered anew, not enlarged from the previous poster.
Run with Python, Pillow and numpy. Preserves every V5 output.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageEnhance
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'posters'
ASSETS = OUT / 'assets'
FONT = ROOT / 'apps/web/public/fonts'
SOURCE = ASSETS / 'ship-slide1-5p75s-topaz4x.png'
SCALE = 4800 / 1800

def px(value):
    return round(value * SCALE)

def compose():
    width, height = 4800, 7200
    navy = np.array([5, 19, 32], dtype=np.float32)
    source = Image.open(SOURCE).convert('RGB')
    if source.size != (5120, 2880):
        raise ValueError(f'Expected 5120x2880 Topaz input, got {source.size}')
    # The supplied upscale has a discoloured 12px boundary. Extend the nearest
    # clean edge pixels over that border only; retain all interior geometry.
    source.paste(source.crop((12, 12, 13, 2868)).resize((12, 2856)), (0, 12))
    source.paste(source.crop((5107, 12, 5108, 2868)).resize((12, 2856)), (5108, 12))
    source.paste(source.crop((0, 12, 5120, 13)).resize((5120, 12)), (0, 0))
    source.paste(source.crop((0, 2867, 5120, 2868)).resize((5120, 12)), (0, 2868))
    photo_height = px(1580)
    photo = source.crop((0, 0, 3280, 2880)).resize((width, photo_height), Image.Resampling.LANCZOS)
    photo = ImageEnhance.Color(photo).enhance(0.89)
    photo = ImageEnhance.Contrast(photo).enhance(1.12)
    # Process in bands to keep memory bounded even at print resolution.
    for top in range(0, photo_height, 128):
        bottom = min(photo_height, top + 128)
        arr = np.array(photo.crop((0, top, width, bottom)), dtype=np.float32) / np.float32(255)
        lum = arr @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)
        warm = np.clip((lum - np.float32(.35)) / np.float32(.5), 0, 1)[..., None]
        arr += warm * np.array([.020, .007, -.018], dtype=np.float32)
        arr += (1 - warm) * np.array([-.016, .002, .012], dtype=np.float32)
        arr = np.clip(arr, 0, 1) * 255
        yy = np.arange(top, bottom, dtype=np.float32)[:, None] / np.float32(SCALE)
        fade = (np.clip((yy - 1260) / 320, 0, 1) ** np.float32(1.15))[..., None]
        arr = arr * (1 - fade) + navy * fade
        photo.paste(Image.fromarray(arr.astype('uint8')), (0, top))

    canvas = Image.new('RGB', (width, height), (5, 19, 32))
    # V5's photographic sky extension, median-filtered only to avoid extending
    # a tiny pennant tip. Main ship image is never retouched by this filter.
    sky_row = np.asarray(photo)[0].copy()
    radius = px(90)
    padded = np.pad(sky_row, ((radius, radius), (0, 0)), mode='edge')
    sky_row = np.median(np.lib.stride_tricks.sliding_window_view(padded, radius * 2 + 1, axis=0), axis=-1).astype('uint8')
    canvas.paste(Image.fromarray(sky_row[None, ...]).resize((width, px(210)), Image.Resampling.NEAREST), (0, 0))
    canvas.paste(photo, (0, px(210)))
    del photo
    xx = np.linspace(-1, 1, width, dtype=np.float32)[None, :]
    edge = np.clip((np.abs(xx) - .6) / .4, 0, 1) * .18
    for top in range(0, height, 128):
        bottom = min(height, top + 128)
        data = np.array(canvas.crop((0, top, width, bottom)), dtype=np.float32)
        yy = np.arange(top, bottom, dtype=np.float32)[:, None] / (height - 1)
        shade = edge * np.clip((.74 - yy) / .2, 0, 1)
        data *= 1 - shade[..., None]
        canvas.paste(Image.fromarray(np.clip(data, 0, 255).astype('uint8')), (0, top))

    d = ImageDraw.Draw(canvas)
    headline = ImageFont.truetype(str(FONT / 'manrope-700.ttf'), px(350))
    lengths = [d.textlength(c, font=headline) for c in 'EMBAT']
    x = (width - sum(lengths) - px(10) * 4) / 2
    for c, length in zip('EMBAT', lengths):
        d.text((x, px(1880)), c, font=headline, fill='#f3e8d2', anchor='lt',
               stroke_width=px(2), stroke_fill='#f3e8d2')
        x += length + px(10)
    logo = Image.open(ASSETS / 'hackspain-logo-reference.png').convert('RGBA')
    logo.thumbnail((px(186), px(70)), Image.Resampling.LANCZOS)
    head = Image.open(ROOT / 'apps/web/public/images/elkano-head.png').convert('RGBA')
    head = head.crop(head.getbbox())
    head.thumbnail((px(75), px(88)), Image.Resampling.LANCZOS)
    font = ImageFont.truetype(str(FONT / 'manrope-500.ttf'), px(43))
    name_width = d.textlength('Elkano', font=font)
    gap, logo_gap, row_height = px(15), px(54), px(88)
    row_width = head.width + gap + name_width + logo_gap + logo.width
    row_x, row_y = round((width - row_width) / 2), px(2461)
    canvas.paste(head, (row_x, row_y + (row_height - head.height) // 2), head)
    d.text((row_x + head.width + gap, row_y + row_height / 2), 'Elkano', font=font, fill='white', anchor='lm')
    canvas.paste(logo, (round(row_x + head.width + gap + name_width + logo_gap), row_y + (row_height - logo.height) // 2), logo)
    canvas.save(OUT / 'embat-poster-v8-hd.png', dpi=(300, 300))
    canvas.save(OUT / 'embat-poster-v8-hd.jpg', quality=97, subsampling=0, dpi=(300, 300))
    canvas.thumbnail((900, 1350))
    canvas.save(OUT / 'embat-poster-v8-hd-preview.jpg', quality=95)
    original = Image.open(ASSETS / 'ship-slide1-5p75s.png').convert('RGB')
    comparison = Image.new('RGB', (1024, 1104), '#051320')
    cd = ImageDraw.Draw(comparison)
    label_font = ImageFont.truetype(str(FONT / 'manrope-500.ttf'), 21)
    cd.text((16, 10), 'Original + Lanczos 4x', font=label_font, fill='white')
    cd.text((528, 10), 'Topaz 4x (100%)', font=label_font, fill='white')
    for index, (sx, sy) in enumerate([(435, 180), (230, 490)]):
        baseline = original.crop((sx, sy, sx + 128, sy + 128)).resize((512, 512), Image.Resampling.LANCZOS)
        enhanced = source.crop((sx * 4, sy * 4, (sx + 128) * 4, (sy + 128) * 4))
        comparison.paste(baseline, (0, 56 + index * 520))
        comparison.paste(enhanced, (512, 56 + index * 520))
    comparison.save(OUT / 'embat-poster-v6-source-comparison.png')
    print('Written V8 PNG/JPG, 4800x7200, 300 DPI. Previous posters untouched.')

if __name__ == '__main__':
    compose()
