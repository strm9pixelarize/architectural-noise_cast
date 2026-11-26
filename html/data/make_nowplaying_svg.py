#!/usr/bin/env python3
"""Generate a Now Playing SVG card for the GitHub profile README.

Fetches the AzuraCast public nowplaying API, downloads the current
song art, embeds it as base64 (SVG shown via <img> cannot load
external resources), and writes a self-contained SVG atomically.

Usage:
    python3 make_nowplaying_svg.py                 # one shot
    python3 make_nowplaying_svg.py --interval 20   # loop every 20s
    python3 make_nowplaying_svg.py --out /path/to/html/data/nowplaying.svg

Stdlib only, except that Pillow (if available) is used to shrink the
artwork to 192x192 JPEG so the SVG stays small.
"""

import argparse
import base64
import io
import json
import sys
import time
import unicodedata
import urllib.request
from xml.sax.saxutils import escape

API_URL = "https://cast.architectural-n.net/api/nowplaying/nerurus_room_rest"
STATION_LABEL = "ねるるの日常(健全版)"
WIDTH, HEIGHT = 480, 120
BG = "#f7f4eb"
INK = "#2f2a20"
SUB = "#4a4436"
MUTED = "#7a7261"
LINE = "#e3ddcb"
ACCENT = "#c0392b"
UA = {"User-Agent": "nowplaying-card/1.0"}


def fetch_json(url):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=10) as r:
        return json.load(r)


def fetch_art_b64(url):
    """Download artwork and return a data URI, or None on any failure."""
    if not url:
        return None
    try:
        req = urllib.request.Request(url, headers=UA)
        with urllib.request.urlopen(req, timeout=10) as r:
            raw = r.read()
            ctype = r.headers.get_content_type()
    except Exception as e:
        print(f"art fetch failed: {e}", file=sys.stderr)
        return None
    try:
        from PIL import Image

        img = Image.open(io.BytesIO(raw)).convert("RGB")
        img.thumbnail((192, 192))
        buf = io.BytesIO()
        img.save(buf, "JPEG", quality=82)
        raw, ctype = buf.getvalue(), "image/jpeg"
    except ImportError:
        pass
    except Exception as e:
        print(f"art resize failed, embedding original: {e}", file=sys.stderr)
    return f"data:{ctype};base64," + base64.b64encode(raw).decode("ascii")


def display_width(s):
    return sum(2 if unicodedata.east_asian_width(c) in "WF" else 1 for c in s)


def truncate(s, max_width):
    if display_width(s) <= max_width:
        return s
    out = ""
    for c in s:
        if display_width(out + c) > max_width - 1:
            break
        out += c
    return out + "…"


def fmt_time(sec):
    sec = max(0, int(sec or 0))
    return f"{sec // 60}:{sec % 60:02d}"


def build_svg(np):
    song = (np.get("now_playing") or {}).get("song") or {}
    npinfo = np.get("now_playing") or {}
    title = truncate(song.get("title") or "—", 40)
    artist = truncate(song.get("artist") or "", 48)
    album = truncate(song.get("album") or "", 30)
    raw_playlist = npinfo.get("playlist") or ""
    # Internal playlists (_weather-spot, _powerplay, ...) are not viewer-facing.
    playlist = "" if raw_playlist.startswith("_") else truncate(raw_playlist, 24)
    elapsed = npinfo.get("elapsed") or 0
    duration = npinfo.get("duration") or 0
    listeners = ((np.get("listeners") or {}).get("current")) or 0
    art_uri = fetch_art_b64(song.get("art"))

    if art_uri:
        art_block = (
            f'<image x="12" y="12" width="96" height="96" '
            f'clip-path="url(#artclip)" href="{art_uri}"/>'
        )
    else:
        art_block = (
            '<rect x="12" y="12" width="96" height="96" rx="8" fill="#e9e2cf"/>'
            '<text x="60" y="72" font-size="34" text-anchor="middle" fill="#a2987d">♪</text>'
        )

    ratio = min(1.0, elapsed / duration) if duration else 0
    bar_w = int(336 * ratio)
    meta = " · ".join(x for x in [album, playlist] if x)
    bottom = f"{escape(meta)}"
    right_bottom = f"Listeners {listeners}　{fmt_time(elapsed)} / {fmt_time(duration)}"

    return f"""<svg xmlns="http://www.w3.org/2000/svg" width="{WIDTH}" height="{HEIGHT}" viewBox="0 0 {WIDTH} {HEIGHT}" role="img" aria-label="Now Playing: {escape(title)} - {escape(artist)}">
  <defs>
    <clipPath id="artclip"><rect x="12" y="12" width="96" height="96" rx="8"/></clipPath>
  </defs>
  <rect x="0.5" y="0.5" width="{WIDTH - 1}" height="{HEIGHT - 1}" rx="12" fill="{BG}" stroke="{LINE}"/>
  {art_block}
  <circle cx="126" cy="27" r="5" fill="{ACCENT}"/>
  <text x="138" y="31" font-family="'Hiragino Sans','Noto Sans JP',sans-serif" font-size="11" font-weight="bold" letter-spacing="1" fill="{ACCENT}">ON AIR</text>
  <text x="468" y="31" font-family="'Hiragino Sans','Noto Sans JP',sans-serif" font-size="11" text-anchor="end" fill="{MUTED}">{escape(STATION_LABEL)}</text>
  <text x="120" y="58" font-family="'Hiragino Sans','Noto Sans JP',sans-serif" font-size="17" font-weight="bold" fill="{INK}">{escape(title)}</text>
  <text x="120" y="79" font-family="'Hiragino Sans','Noto Sans JP',sans-serif" font-size="13" fill="{SUB}">{escape(artist)}</text>
  <rect x="120" y="88" width="336" height="4" rx="2" fill="#e0d9c6"/>
  <rect x="120" y="88" width="{bar_w}" height="4" rx="2" fill="{ACCENT}"/>
  <text x="120" y="108" font-family="'Hiragino Sans','Noto Sans JP',sans-serif" font-size="10.5" fill="{MUTED}">{bottom}</text>
  <text x="468" y="108" font-family="'Hiragino Sans','Noto Sans JP',sans-serif" font-size="10.5" text-anchor="end" fill="{MUTED}">{escape(right_bottom)}</text>
</svg>
"""


def write_atomic(path, text):
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        f.write(text)
    import os

    os.replace(tmp, path)


def one_shot(out):
    np = fetch_json(API_URL)
    svg = build_svg(np)
    write_atomic(out, svg)
    song = (np.get("now_playing") or {}).get("song") or {}
    print(f"wrote {out} ({len(svg)} bytes): {song.get('artist')} - {song.get('title')}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="nowplaying.svg")
    ap.add_argument("--interval", type=int, default=0, help="loop interval seconds (0 = one shot)")
    args = ap.parse_args()
    while True:
        try:
            one_shot(args.out)
        except Exception as e:
            # Never die on a transient API failure; the old SVG stays in place.
            print(f"nowplaying update failed: {e}", file=sys.stderr)
            if not args.interval:
                raise
        if not args.interval:
            break
        time.sleep(args.interval)


if __name__ == "__main__":
    main()
