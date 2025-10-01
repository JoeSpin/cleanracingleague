#!/usr/bin/env python3
"""Fetch and inject latest standings tables for each series.

Logic:
 1. For each configured series, download the SimRacerHub season standings page.
 2. Parse out driver and (optionally) team tables.
 3. Clean unwanted inline styles / attributes.
 4. Replace content between marker pairs:
     <!-- START_DRIVERS --> ... <!-- END_DRIVERS -->
     <!-- START_TEAMS -->   ... <!-- END_TEAMS --> (if present & enabled)
 5. Add timestamp comment after START markers.

 Safety:
  - If REAL_FETCH env var != '1', script performs a dry-run (no file writes).
  - On fetch/parse failure, existing file is left unchanged.
  - Only writes a file if at least one table successfully updated.

 Extensibility:
  - Adjust SERIES config below (inject_teams False for Elite as requested).
"""
from __future__ import annotations
import pathlib
import datetime as dt
import re
import os
import sys
import time
from typing import Optional, Tuple

import requests
from bs4 import BeautifulSoup

SERIES = {
    "trucks": {
        "file": "trucks/index.html",
        "url": "https://www.simracerhub.com/scoring/season_standings.php?series_id=10554",
        "inject_teams": True,
    },
    "elite": {
        "file": "elite/index.html",
        "url": "https://www.simracerhub.com/scoring/season_standings.php?series_id=13239",
        "inject_teams": False,  # Team standings intentionally omitted
    },
    "arca": {
        "file": "arca/index.html",
        "url": "https://www.simracerhub.com/scoring/season_standings.php?series_id=12526",
        "inject_teams": True,
    },
}

ENABLE_REAL = os.getenv("REAL_FETCH") == "1"
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/124.0 Safari/537.36 CleanRacingBot/1.0"
)

STAMP_FMT = "%Y-%m-%dT%H:%M:%SZ"

def replace_block(text: str, name: str, new_inner: str, series_name: str) -> Tuple[str, bool]:
    pattern = re.compile(rf"(<!-- START_{name} -->)(.*?)(<!-- END_{name} -->)", re.DOTALL)
    ts = dt.datetime.now(dt.timezone.utc).strftime(STAMP_FMT)
    block = (
        f"<!-- UPDATED {ts} UTC series={series_name} marker={name} -->\n"
        f"<div class=\"table-wrap\">\n{new_inner}\n</div>"
    )
    replacement = rf"\1\n{block}\n\3"
    new_text, count = pattern.subn(replacement, text)
    if count == 0:
        print(f"WARN: [{series_name}] Marker pair START_{name} / END_{name} not found")
        return text, False
    return new_text, True


def fetch_html(url: str, retries: int = 3, backoff: float = 2.0) -> str:
    last_exc = None
    for attempt in range(1, retries + 1):
        try:
            resp = requests.get(url, timeout=20, headers={"User-Agent": USER_AGENT})
            resp.raise_for_status()
            return resp.text
        except Exception as e:  # noqa: BLE001
            last_exc = e
            print(f"WARN: fetch attempt {attempt} failed: {e}")
            if attempt < retries:
                time.sleep(backoff * attempt)
    raise RuntimeError(f"All fetch attempts failed: {last_exc}")


def extract_tables(raw_html: str) -> Tuple[Optional[str], Optional[str]]:
    """Return (drivers_table_html, teams_table_html) if found.

    Strategy: find all <table> elements; heuristically classify.
    We look for header cells containing 'Driver' vs 'Team' keywords.
    """
    soup = BeautifulSoup(raw_html, "lxml")
    tables = soup.find_all("table")
    driver_table = None
    team_table = None
    for tbl in tables:
        headers = " ".join(th.get_text(strip=True).lower() for th in tbl.find_all("th"))
        if not headers:
            continue
        # Heuristics: decide classification
        if driver_table is None and ("driver" in headers or "pos" in headers):
            driver_table = tbl
            continue
        if team_table is None and ("team" in headers and "pos" in headers and "driver" not in headers):
            team_table = tbl
    def clean(tbl):
        if tbl is None:
            return None
        # strip inline styles / bgcolor
        for tag in tbl.find_all(True):
            for attr in list(tag.attrs):
                if attr.lower() in {"style", "bgcolor", "width", "height", "cellpadding", "cellspacing"}:
                    del tag.attrs[attr]
        return str(tbl)
    return clean(driver_table), clean(team_table)


def build_series(series_key: str, cfg: dict, root: pathlib.Path, dry_run: bool) -> bool:
    file_path = root / cfg["file"]
    if not file_path.exists():
        print(f"Skip [{series_key}] missing file {cfg['file']}")
        return False
    try:
        html = fetch_html(cfg["url"]) if not dry_run else ""
        drivers_html, teams_html = (None, None)
        if not dry_run:
            drivers_html, teams_html = extract_tables(html)
        if drivers_html is None:
            print(f"ERROR: [{series_key}] No driver table detected; aborting changes for this series.")
            return False
        original = file_path.read_text(encoding="utf-8")
        updated = original
        changed_any = False
        updated, changed = replace_block(updated, "DRIVERS", drivers_html, series_key)
        changed_any |= changed
        if cfg.get("inject_teams") and teams_html:
            updated, changed = replace_block(updated, "TEAMS", teams_html, series_key)
            changed_any |= changed
        elif cfg.get("inject_teams") and not teams_html:
            print(f"WARN: [{series_key}] Team injection requested but no team table found.")
        if changed_any and not dry_run:
            file_path.write_text(updated, encoding="utf-8")
            print(f"Updated [{series_key}] {cfg['file']}")
        else:
            print(f"No changes for [{series_key}] (dry_run={dry_run} changed_any={changed_any})")
        return changed_any and not dry_run
    except Exception as e:  # noqa: BLE001
        print(f"ERROR: [{series_key}] {e}")
        return False

def main():
    root = pathlib.Path(__file__).resolve().parent.parent
    dry_run = not ENABLE_REAL
    if dry_run:
        print("REAL_FETCH not enabled; performing dry run (no writes). Set REAL_FETCH=1 to apply updates.")
    overall_changed = False
    for key, cfg in SERIES.items():
        changed = build_series(key, cfg, root, dry_run=dry_run)
        overall_changed = overall_changed or changed
    if not overall_changed:
        print("No series updated (either dry run or no detected changes).")

if __name__ == "__main__":  # pragma: no cover
    main()
