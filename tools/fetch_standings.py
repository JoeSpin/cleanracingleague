#!/usr/bin/env python3
"""Basic placeholder script to update standings markers.

Extend this with real fetching logic later. For now it stamps a timestamp so the
GitHub Action demonstrates committing changes.
"""
from __future__ import annotations
import pathlib
import datetime as dt
import re

# Config: list of (file, marker_name, replacement_html)
# You can later replace replacement_html with fetched/parsed table HTML.
FILES = [
    ("trucks/index.html", "DRIVERS", "<p>Standings auto update placeholder</p>"),
    ("arca/index.html", "DRIVERS", "<p>Standings auto update placeholder</p>"),
    ("elite/index.html", "DRIVERS", "<p>Standings auto update placeholder</p>"),
]

STAMP_FMT = "%Y-%m-%dT%H:%M:%SZ"

def replace_block(text: str, name: str, new_inner: str) -> str:
    pattern = re.compile(rf"(<!-- START_{name} -->)(.*?)(<!-- END_{name} -->)", re.DOTALL)
    ts = dt.datetime.utcnow().strftime(STAMP_FMT)
    replacement = rf"\1\n<!-- UPDATED {ts} UTC -->\n{new_inner}\n\3"
    new_text, count = pattern.subn(replacement, text)
    if count == 0:
        print(f"WARN: Marker pair START_{name} / END_{name} not found")
    return new_text

def main():
    root = pathlib.Path(__file__).resolve().parent.parent
    changed = False
    for rel, marker, html in FILES:
        path = root / rel
        if not path.exists():
            print(f"Skip missing {rel}")
            continue
        original = path.read_text(encoding="utf-8")
        updated = replace_block(original, marker, html)
        if updated != original:
            path.write_text(updated, encoding="utf-8")
            print(f"Updated {rel} ({marker})")
            changed = True
    if not changed:
        print("No marker content changed (placeholders).")

if __name__ == "__main__":
    main()
