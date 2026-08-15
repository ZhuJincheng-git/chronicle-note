from pathlib import Path

from PIL import Image


root = Path(__file__).resolve().parents[1]
source = root / "assets" / "images" / "icon.png"
targets = [
    root / "assets" / "images" / "icon.png",
    root / "assets" / "images" / "splash-icon.png",
    root / "assets" / "images" / "favicon.png",
    root / "assets" / "images" / "android-icon-foreground.png",
]

with Image.open(source) as original:
    image = original.convert("RGB")
    image.thumbnail((1024, 1024), Image.Resampling.LANCZOS)
    optimized = image.quantize(colors=32, method=Image.Quantize.MEDIANCUT)
    for target in targets:
        optimized.save(target, format="PNG", optimize=True, compress_level=9)

print("Optimized app icon assets")
