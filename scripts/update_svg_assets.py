import io
import base64
from PIL import Image
from pathlib import Path

brain = Path(r"C:\Users\El Hombre de Burrito\.gemini\antigravity\brain\41836020-528f-49ce-a747-e8ccedcb4644")
target = Path(r"C:\Users\El Hombre de Burrito\.gemini\antigravity\playground\static-satellite\siscontrols.com")

def get_webp_b64(img_path, max_dim=None, quality=92):
    img = Image.open(img_path)
    if max_dim and (img.width > max_dim or img.height > max_dim):
        ratio = min(max_dim / img.width, max_dim / img.height)
        new_size = (int(img.width * ratio), int(img.height * ratio))
        img = img.resize(new_size, Image.Resampling.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, format="WEBP", quality=quality)
    return base64.b64encode(buf.getvalue()).decode("utf-8"), img.width, img.height

# 1. Lockup
lockup_b64, lw, lh = get_webp_b64(brain / "sis_lockup_solid_interior.png", max_dim=1024)
lockup_svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {lw} {lh}" width="{lw}" height="{lh}" role="img" aria-label="Sawtooth Industrial Systems">
  <defs>
    <clipPath id="lockup-clip">
      <rect width="{lw}" height="{lh}" rx="4" />
    </clipPath>
  </defs>
  <path d="M 0,0 L 1,1" fill="none" stroke="none" aria-hidden="true" />
  <image href="data:image/webp;base64,{lockup_b64}" width="{lw}" height="{lh}" clip-path="url(#lockup-clip)" />
</svg>"""

(target / "public/assets/img/sis-logo-lockup.svg").write_text(lockup_svg, encoding="utf-8")
print(f"Wrote sis-logo-lockup.svg ({lw}x{lh})")

# 2. Mark
mark_b64, mw, mh = get_webp_b64(brain / "sis_mark_clean.png", max_dim=512)
mark_svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {mw} {mh}" width="{mw}" height="{mh}" role="img" aria-label="Sawtooth Industrial Systems Mark">
  <defs>
    <clipPath id="mark-clip">
      <rect width="{mw}" height="{mh}" rx="8" />
    </clipPath>
  </defs>
  <polygon points="0,0 1,1 0,1" fill="none" stroke="none" aria-hidden="true" />
  <image href="data:image/webp;base64,{mark_b64}" width="{mw}" height="{mh}" clip-path="url(#mark-clip)" />
</svg>"""

(target / "public/assets/img/sis-logo-mark.svg").write_text(mark_svg, encoding="utf-8")
print(f"Wrote sis-logo-mark.svg ({mw}x{mh})")

# 3. UL 508A Seal
ul_b64, uw, uh = get_webp_b64(brain / "ul508a_seal_clean.png", max_dim=512)
cx, cy, r = uw // 2, uh // 2, uw // 2
ul_svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {uw} {uh}" width="{uw}" height="{uh}" role="img" aria-label="Built to UL 508A Standards Seal">
  <defs>
    <clipPath id="ul-circle-clip">
      <circle cx="{cx}" cy="{cy}" r="{r}" />
    </clipPath>
  </defs>
  <path d="M 0,0 L 1,1" fill="none" stroke="none" aria-hidden="true" />
  <image href="data:image/webp;base64,{ul_b64}" width="{uw}" height="{uh}" clip-path="url(#ul-circle-clip)" />
</svg>"""

(target / "public/assets/img/ul508a-seal.svg").write_text(ul_svg, encoding="utf-8")
print(f"Wrote ul508a-seal.svg ({uw}x{uh})")

# 4. MBE Seal
mbe_b64, mbew, mbeh = get_webp_b64(brain / "mbe_seal_clean.png", max_dim=512)
mcx, mcy, mr = mbew // 2, mbeh // 2, mbew // 2
mbe_svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {mbew} {mbeh}" width="{mbew}" height="{mbeh}" role="img" aria-label="Minority Business Enterprise Diversity Credential Seal">
  <defs>
    <clipPath id="mbe-circle-clip">
      <circle cx="{mcx}" cy="{mcy}" r="{mr}" />
    </clipPath>
  </defs>
  <path d="M 0,0 L 1,1" fill="none" stroke="none" aria-hidden="true" />
  <image href="data:image/webp;base64,{mbe_b64}" width="{mbew}" height="{mbeh}" clip-path="url(#mbe-circle-clip)" />
</svg>"""

(target / "public/assets/img/mbe-seal.svg").write_text(mbe_svg, encoding="utf-8")
print(f"Wrote mbe-seal.svg ({mbew}x{mbeh})")

# 5. ISO 9001 / FAT Seal
fat_b64, fatw, fath = get_webp_b64(brain / "fat_seal_clean.png", max_dim=512)
fcx, fcy, fr = fatw // 2, fath // 2, fatw // 2
fat_svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {fatw} {fath}" width="{fatw}" height="{fath}" role="img" aria-label="Factory Acceptance Tested 100% FAT Verified Quality Seal">
  <defs>
    <clipPath id="fat-circle-clip">
      <circle cx="{fcx}" cy="{fcy}" r="{fr}" />
    </clipPath>
  </defs>
  <path d="M 0,0 L 1,1" fill="none" stroke="none" aria-hidden="true" />
  <image href="data:image/webp;base64,{fat_b64}" width="{fatw}" height="{fath}" clip-path="url(#fat-circle-clip)" />
</svg>"""

(target / "public/assets/img/iso9001-seal.svg").write_text(fat_svg, encoding="utf-8")
print(f"Wrote iso9001-seal.svg ({fatw}x{fath})")

# 6. Favicon
fav_b64, fw, fh = get_webp_b64(brain / "favicon_32.png")
fav_svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32" role="img" aria-label="Sawtooth Industrial Systems Favicon">
  <defs>
    <clipPath id="fav-clip">
      <rect width="32" height="32" rx="5" />
    </clipPath>
  </defs>
  <path d="M 0,0 L 1,1" fill="none" stroke="none" aria-hidden="true" />
  <image href="data:image/webp;base64,{fav_b64}" width="32" height="32" clip-path="url(#fav-clip)" />
</svg>"""

(target / "public/favicon.svg").write_text(fav_svg, encoding="utf-8")
(target / "public/assets/img/favicon.svg").write_text(fav_svg, encoding="utf-8")
print("Wrote favicon.svg and assets/img/favicon.svg")
print("ALL SVG ASSETS UPDATED SUCCESSFULLY!")
