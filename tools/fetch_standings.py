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
        "race_results_url": "https://www.simracerhub.com/scoring/season_race.php?series_id=10554",
        "inject_teams": True,
    },
    "elite": {
        "file": "elite/index.html",
        "url": "https://www.simracerhub.com/scoring/season_standings.php?series_id=13239",
        "race_results_url": "https://www.simracerhub.com/scoring/season_race.php?series_id=13239",
        "inject_teams": False,  # Team standings intentionally omitted
    },
    "arca": {
        "file": "arca/index.html",
        "url": "https://www.simracerhub.com/scoring/season_standings.php?series_id=12526",
        "race_results_url": "https://www.simracerhub.com/scoring/season_race.php?series_id=12526",
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


def replace_content_block(text: str, name: str, new_inner: str, series_name: str) -> Tuple[str, bool]:
    """Replace block content without adding table-wrap div (for race winner section)"""
    pattern = re.compile(rf"(<!-- START_{name} -->)(.*?)(<!-- END_{name} -->)", re.DOTALL)
    ts = dt.datetime.now(dt.timezone.utc).strftime(STAMP_FMT)
    block = f"<!-- UPDATED {ts} UTC series={series_name} marker={name} -->\n{new_inner}"
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


def reorder_driver_table_columns(tbl):
    """Reorder driver table columns to match desired layout:
    Pos, Chg, Driver, Points, Behind Next, Starts/Races, Wins, Top 5, Top 10, Laps, Inc
    """
    # Map of desired column order to their data-sortkey values
    desired_columns = [
        "pos",      # Pos
        "chg",      # Chg  
        "driver",   # Driver
        "tpts",     # Points
        "behn",     # Behind Next
        "starts",   # Starts/Races
        "wins",     # Wins
        "t5",       # Top 5
        "t10",      # Top 10
        "laps",     # Laps
        "inc"       # Inc
    ]
    
    # Get all rows
    rows = tbl.find_all("tr")
    if not rows:
        return tbl
        
    # Find header row and map columns by sortkey
    header_row = None
    for row in rows:
        if "jsTableHdr" in row.get("class", []):
            header_row = row
            break
    
    if not header_row:
        return tbl
    
    # Get current column indices by sortkey
    headers = header_row.find_all("th")
    sortkey_to_index = {}
    for i, th in enumerate(headers):
        sortkey = th.get("data-sortkey", "")
        if sortkey:
            sortkey_to_index[sortkey] = i
    
    # Reorder all rows
    for row in rows:
        cells = row.find_all(["th", "td"])
        if len(cells) == 0:
            continue
            
        # Create new ordered cells
        new_cells = []
        for sortkey in desired_columns:
            if sortkey in sortkey_to_index:
                old_index = sortkey_to_index[sortkey]
                if old_index < len(cells):
                    new_cells.append(cells[old_index])
        
        # Replace row content with reordered cells
        row.clear()
        for cell in new_cells:
            row.append(cell)
    
    return tbl


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
        
        # strip inline styles / bgcolor and add proper classes
        for tag in tbl.find_all(True):
            for attr in list(tag.attrs):
                if attr.lower() in {"style", "bgcolor", "width", "height", "cellpadding", "cellspacing"}:
                    del tag.attrs[attr]
        
        # Also remove specific table attributes that interfere with styling
        if tbl.name == "table":
            for attr in list(tbl.attrs):
                if attr.lower() in {"cellspacing", "style", "width"}:
                    del tbl.attrs[attr]
        
        # Add proper classes for styling
        if tbl.name == "table":
            # Add standings-table class and keep the original ID
            existing_classes = tbl.get("class", [])
            if "standings-table" not in existing_classes:
                existing_classes.append("standings-table")
            tbl["class"] = existing_classes
        
        # Fix relative URLs to point to SimRacerHub
        for link in tbl.find_all("a", href=True):
            href = link.get("href")
            if href and not href.startswith(("http://", "https://", "#")):
                # Convert relative URLs to absolute SimRacerHub URLs
                link["href"] = f"https://www.simracerhub.com/scoring/{href}"
                # Add target="_blank" to open in new tab
                link["target"] = "_blank"
                # Add rel="noopener" for security
                link["rel"] = "noopener"
        
        # Replace multi-line headers with single-line versions
        header_replacements = {
            "Tot<br/>Pts": "Points",
            "Beh<br/>Next": "Behind",
            "Beh<br/>Lead": "Lead Gap",
            "T-<br/>5": "Top 5",
            "T-<br/>10": "Top 10", 
            "Bns<br/>Pts": "Bonus",
            # Team standings specific headers
            "Races<br/>Counted": "Races",
            "Pen<br/>Pts": "Penalty",
        }
        
        for th in tbl.find_all("th"):
            original_text = str(th)
            for old_text, new_text in header_replacements.items():
                if old_text in original_text:
                    # Replace the content while preserving attributes
                    th.string = new_text
                    break
        
        # Reorder columns for driver tables only
        if tbl.get("id") == "driver_table":
            tbl = reorder_driver_table_columns(tbl)
        
        return str(tbl)
    return clean(driver_table), clean(team_table)


def fetch_race_results(race_results_url: str) -> Tuple[Optional[str], Optional[str], Optional[str]]:
    """Fetch race winner and track info from race results page.
    
    Returns (winner_name, track_name, race_date) or (None, None, None) on failure.
    """
    try:
        response = requests.get(race_results_url, timeout=30)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, "lxml")
        
        # Extract track name from the h3 header or page content
        track_name = None
        
        # First try h3 headers
        track_headers = soup.find_all("h3")
        for header in track_headers:
            text = header.get_text(strip=True).upper()
            # Look for track names (usually all caps, contains "SPEEDWAY" or similar)
            if any(keyword in text for keyword in ["SPEEDWAY", "RACEWAY", "SUPERSPEEDWAY", "ROAD", "CIRCUIT"]):
                track_name = text.title()  # Convert to title case
                break
        
        # If not found in h3, try searching the page content for track names
        if not track_name:
            page_text = soup.get_text().upper()
            import re
            # Look for common track name patterns
            track_patterns = [
                r'HOMESTEAD MIAMI SPEEDWAY',
                r'KENTUCKY SPEEDWAY',
                r'DAYTONA INTERNATIONAL SPEEDWAY',
                r'TALLADEGA SUPERSPEEDWAY',
                r'PHOENIX RACEWAY',
                r'ATLANTA MOTOR SPEEDWAY',
                r'LAS VEGAS MOTOR SPEEDWAY',
                r'AUTO CLUB SPEEDWAY',
                r'POCONO RACEWAY',
                r'MICHIGAN INTERNATIONAL SPEEDWAY',
                r'CHARLOTTE MOTOR SPEEDWAY',
                r'TEXAS MOTOR SPEEDWAY',
                r'KANSAS SPEEDWAY',
                r'CHICAGO STREET COURSE',
                r'NEW HAMPSHIRE MOTOR SPEEDWAY',
                r'WATKINS GLEN INTERNATIONAL',
                r'ROAD AMERICA',
                r'RICHMOND RACEWAY',
                r'BRISTOL MOTOR SPEEDWAY',
                r'MARTINSVILLE SPEEDWAY',
                r'[A-Z\s]+(SPEEDWAY|RACEWAY|SUPERSPEEDWAY|INTERNATIONAL|MOTOR SPEEDWAY)'
            ]
            
            for pattern in track_patterns:
                match = re.search(pattern, page_text)
                if match:
                    track_name = match.group(0).title()
                    break
        
        # Extract winner from race results table (first row, position 1)
        winner_name = None
        race_date = None
        
        # Find the race results table
        tables = soup.find_all("table")
        for table in tables:
            # Look for table with race results (has position numbers)
            rows = table.find_all("tr")
            for row in rows:
                cells = row.find_all(["td", "th"])
                if len(cells) >= 3:  # Need at least pos, car#, driver
                    # Check if first cell is position "1"
                    if cells[0].get_text(strip=True) == "1":
                        # Find driver name in the row (usually 3rd column)
                        for i, cell in enumerate(cells):
                            # Look for driver name (usually has a link or is in a specific column)
                            links = cell.find_all("a")
                            if links:
                                winner_name = links[0].get_text(strip=True)
                                break
                            # Fallback: if no links, check for driver name patterns
                            text = cell.get_text(strip=True)
                            if i >= 2 and len(text) > 3 and not text.isdigit():  # Skip pos and car# columns
                                winner_name = text
                                break
                        break
            if winner_name:
                break
        
        # Extract race date from header section
        date_text = soup.get_text()
        # Look for date patterns like "Sep 29, 2025" or "OCT 1, 2025"
        import re
        date_match = re.search(r'([A-Z]{3}\s+\d{1,2},\s+\d{4})', date_text.upper())
        if date_match:
            race_date = date_match.group(1).title()
        
        return winner_name, track_name, race_date
        
    except Exception as e:
        print(f"Failed to fetch race results from {race_results_url}: {e}")
        return None, None, None


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
        
        # Fetch race results
        race_winner_html = None
        if not dry_run and cfg.get("race_results_url"):
            winner_name, track_name, race_date = fetch_race_results(cfg["race_results_url"])
            if winner_name and track_name:
                # Build race winner HTML section
                race_winner_html = f'''<div class="race-winner">
    <div class="race-winner-content">
        <h3>Latest Race Winner</h3>
        <div class="winner-info">
            <div class="winner-name">{winner_name}</div>
            <div class="track-info">{track_name}</div>
            {f'<div class="race-date">{race_date}</div>' if race_date else ''}
        </div>
        <div class="view-results-btn">
            <a href="{cfg["race_results_url"]}" target="_blank" rel="noopener">View Full Results</a>
        </div>
    </div>
</div>'''
        
        original = file_path.read_text(encoding="utf-8")
        updated = original
        changed_any = False
        
        # Update race winner section
        if race_winner_html:
            updated, changed = replace_content_block(updated, "RACE_WINNER", race_winner_html, series_key)
            changed_any |= changed
        
        # Update standings tables
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
