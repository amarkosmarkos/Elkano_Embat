"""Poster composed in Python from an existing slide-one frame, without generation calls."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageEnhance, ImageFilter
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'posters'
SOURCE = OUT / 'assets/ship-slide1-5p75s.png'
FONT = ROOT / 'apps/web/public/fonts'

def compose():
    width, height = 1800, 2700
    navy = np.array([5, 19, 32], dtype=np.float32)
    source = Image.open(SOURCE).convert('RGB')
    # Original frame is 1280x720. Keep all spars and pennants, remove empty right sky.
    photo = source.crop((0, 0, 820, 720)).resize((width, 1580), Image.Resampling.LANCZOS)
    photo = ImageEnhance.Color(photo).enhance(0.89)
    photo = ImageEnhance.Contrast(photo).enhance(1.12)
    arr = np.asarray(photo).astype(np.float32) / 255
    # Photographic split-tone: warm canvas/highlights, cool sea/shadows.
    lum = arr @ np.array([0.2126, 0.7152, 0.0722])
    warm = np.clip((lum - 0.35) / 0.5, 0, 1)[..., None]
    arr += warm * np.array([0.020, 0.007, -0.018])
    arr += (1 - warm) * np.array([-0.016, 0.002, 0.012])
    arr = np.clip(arr, 0, 1) * 255
    # Bottom dissolves into ink, leaving the boat itself untouched.
    yy = np.arange(1580)[:, None]
    fade = np.clip((yy - 1260) / 320, 0, 1) ** 1.15
    arr = arr * (1 - fade[..., None]) + navy * fade[..., None]
    photo = Image.fromarray(arr.astype('uint8'))
    canvas = Image.new('RGB', (width, height), tuple(navy.astype(int)))
    # Quiet sky extension from original sky pixels, not synthesis or generation.
    # Remove a narrow pennant-tip pixel from the sky extension, without touching
    # the photographed ship: median of neighbouring original sky pixels only.
    sky_row = np.asarray(photo)[0].copy()
    padded = np.pad(sky_row, ((90, 90), (0, 0)), mode='edge')
    sky_row = np.median(np.lib.stride_tricks.sliding_window_view(padded, 181, axis=0), axis=-1).astype('uint8')
    sky = Image.fromarray(sky_row[None, ...]).resize((width, 210), Image.Resampling.NEAREST)
    canvas.paste(sky, (0, 0))
    canvas.paste(photo, (0, 210))
    # Gentle edge shading joins the frame into a cinematic print composition.
    data = np.asarray(canvas).astype(np.float32)
    x = np.linspace(-1, 1, width)[None, :]
    y = np.linspace(0, 1, height)[:, None]
    shade = np.clip((np.abs(x) - 0.6) / 0.4, 0, 1) * 0.18
    shade = shade * np.clip((0.74 - y) / 0.2, 0, 1)
    data = data * (1 - shade[..., None])
    canvas = Image.fromarray(np.clip(data, 0, 255).astype('uint8'))
    d = ImageDraw.Draw(canvas)
    cream = '#f3e8d2'

    def tracked(text, cy, size, spacing, fill, weight='500'):
        font = ImageFont.truetype(str(FONT / f'manrope-{weight}.ttf'), size)
        lengths = [d.textlength(c, font=font) for c in text]
        total = sum(lengths) + spacing * (len(text) - 1)
        xx = (width - total) / 2
        for c, length in zip(text, lengths):
            d.text((xx, cy), c, font=font, fill=fill, anchor='lt')
            xx += length + spacing

    tracked('EMBAT', 1880, 324, 10, cream, '700')
    logo = Image.open(OUT / 'assets/hackspain-logo-reference.png').convert('RGBA')
    logo.thumbnail((186, 70), Image.Resampling.LANCZOS)
    head = Image.open(ROOT / 'apps/web/public/images/elkano-head.png').convert('RGBA')
    head = head.crop(head.getbbox())
    head.thumbnail((60, 70), Image.Resampling.LANCZOS)
    small_font = ImageFont.truetype(str(FONT / 'manrope-500.ttf'), 34)
    name_width = d.textlength('Elkano', font=small_font)
    gap, logo_gap = 15, 54
    row_width = head.width + gap + name_width + logo_gap + logo.width
    row_x = round((width - row_width) / 2)
    row_y = 2470
    canvas.paste(head, (row_x, row_y + (70 - head.height) // 2), head)
    d.text((row_x + head.width + gap, row_y + 35), 'Elkano', fill='white', font=small_font, anchor='lm')
    canvas.paste(logo, (round(row_x + head.width + gap + name_width + logo_gap), row_y + (70 - logo.height) // 2), logo)
    canvas.save(OUT / 'embat-poster-v5-python.png', dpi=(150, 150))
    canvas.save(OUT / 'embat-poster-v5-python.jpg', quality=96, subsampling=0, dpi=(150, 150))
    preview = canvas.copy()
    preview.thumbnail((900, 1350))
    preview.save(OUT / 'embat-poster-v5-python-preview.jpg', quality=94)

if __name__ == '__main__':
    compose()
