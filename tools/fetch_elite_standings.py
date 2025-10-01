#!/usr/bin/env python3
"""Fetch Elite series standings from SimRacerHub and inject into elite/index.html.

Source (Elite series):
    https://www.simracerhub.com/scoring/season_standings.php?series_id=13239

Usage:
    python tools/fetch_elite_standings.py                 # uses default URL above
    python tools/fetch_elite_standings.py <custom_url>    # override source URL

Markers in elite/index.html:
    <!-- START_DRIVERS --> ... <!-- END_DRIVERS -->
    <!-- START_TEAMS --> ... <!-- END_TEAMS -->

This mirrors logic of fetch_standings.py (Trucks) but targets Elite page.
"""
import sys
import requests
from bs4 import BeautifulSoup
from pathlib import Path
from datetime import datetime

DEFAULT_URL = "https://www.simracerhub.com/scoring/season_standings.php?series_id=13239"

BASE_PREFIX = 'https://www.simracerhub.com/scoring/'

DRIVER_MARKERS = ('<!-- START_DRIVERS -->', '<!-- END_DRIVERS -->')
TEAM_MARKERS = ('<!-- START_TEAMS -->', '<!-- END_TEAMS -->')

TARGET_FILE = Path('elite/index.html')


def rewrite_links(node):
    for a in node.find_all('a', href=True):
        href = a['href']
        if href.startswith('http'):
            continue
        if 'driver_stats.php' in href:
            idx = href.find('driver_stats.php')
            a['href'] = BASE_PREFIX + href[idx:]


def normalize_table(tag):
    try:
        if tag and tag.name == 'table':
            existing = tag.get('class', [])
            if 'standings-table' not in existing:
                existing.append('standings-table')
                tag['class'] = existing
            style = tag.get('style', '')
            if 'min-width' not in style:
                tag['style'] = (style + ';min-width:700px;').strip(';')
    except Exception:
        pass


def wrap_if_needed(html_str: str) -> str:
    if 'class="table-wrap"' in html_str:
        return html_str
    return '<div class="table-wrap">\n' + html_str + '\n</div>'


def inject_between(text: str, markers: tuple[str,str], replacement: str) -> str:
    start_marker, end_marker = markers
    start = text.find(start_marker)
    end = text.find(end_marker)
    if start == -1 or end == -1 or end < start:
        return text
    before = text[:start+len(start_marker)]
    after = text[end:]
    return before + '\n' + replacement + '\n' + after


def main():
    url = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_URL
    print(f"[fetch_elite] {datetime.utcnow().isoformat()}Z fetching: {url}")
    try:
        r = requests.get(url, timeout=20, headers={"User-Agent":"CRL Elite Standings Fetcher/1.0"})
        r.raise_for_status()
    except Exception as e:
        print(f"[fetch_elite] ERROR fetching URL: {e}")
        sys.exit(2)

    soup = BeautifulSoup(r.text, 'html.parser')

    drivers = soup.find(id='driver_table')
    teams = soup.find(id='team_table')
    if not drivers:
        print('[fetch_elite] WARNING: driver_table not found')
    if not teams:
        print('[fetch_elite] WARNING: team_table not found')

    drivers_html = ''
    teams_html = ''

    if drivers:
        rewrite_links(drivers)
        normalize_table(drivers)
        drivers_html = wrap_if_needed(str(drivers))
    else:
        drivers_html = '<p>No drivers table found.</p>'
    if teams:
        rewrite_links(teams)
        normalize_table(teams)
        teams_html = wrap_if_needed(str(teams))
    else:
        teams_html = '<p>No team table found.</p>'

    if not TARGET_FILE.exists():
        print(f'[fetch_elite] ERROR: {TARGET_FILE} does not exist.')
        sys.exit(1)

    text = TARGET_FILE.read_text(encoding='utf-8')
    text = inject_between(text, DRIVER_MARKERS, drivers_html)
    text = inject_between(text, TEAM_MARKERS, teams_html)
    TARGET_FILE.write_text(text, encoding='utf-8')
    print('[fetch_elite] Updated', TARGET_FILE)
    print('[fetch_elite] Done.')


if __name__ == '__main__':
    main()
