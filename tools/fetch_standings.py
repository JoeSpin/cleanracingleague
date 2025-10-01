#!/usr/bin/env python3
"""Fetch standings from the SimRacerHub Trucks series season standings page and inject tables.

Default source (Trucks series):
    https://www.simracerhub.com/scoring/season_standings.php?series_id=10554

Usage:
    python tools/fetch_standings.py                # uses default URL above
    python tools/fetch_standings.py <custom_url>   # override source URL

Behavior:
    - Downloads the standings page.
    - Extracts driver and team tables (by id: driver_table / team_table) if present.
    - Ensures each table has min-width and wrapper for horizontal scroll.
    - Rewrites relative driver_stats.php links to absolute scoring URLs.
    - Injects into trucks/index.html between <!-- START_DRIVERS --> / <!-- END_DRIVERS --> and
      <!-- START_TEAMS --> / <!-- END_TEAMS --> markers.
"""
import sys
import requests
from bs4 import BeautifulSoup
from pathlib import Path
from datetime import datetime

DEFAULT_URL = "https://www.simracerhub.com/scoring/season_standings.php?series_id=10554"

def parse_table(table):
    # extract headers if present
    headers = []
    header_row = table.find('tr')
    if header_row:
        ths = header_row.find_all('th')
        if ths:
            headers = [th.get_text(strip=True) for th in ths]
            rows = table.find_all('tr')[1:]
        else:
            # no th, try to infer number of columns from first tr's tds
            rows = table.find_all('tr')
    else:
        rows = []

    parsed = []
    for tr in rows:
        tds = tr.find_all(['td','th'])
        if not tds:
            continue
        cells = [td.get_text(strip=True) for td in tds]
        parsed.append(cells)

    return headers, parsed

def render_table_html(title, headers, rows):
    html = []
    html.append(f'<section class="standings-section">')
    if title:
        html.append(f'<h2>{title}</h2>')
    html.append('<div class="table-wrap">')
    html.append('<table class="standings-table">')
    if headers:
        html.append('<thead><tr>')
        for h in headers:
            html.append(f'<th>{h}</th>')
        html.append('</tr></thead>')
    html.append('<tbody>')
    for row in rows:
        html.append('<tr>')
        for i, cell in enumerate(row):
            label = headers[i] if headers and i < len(headers) else f'Col {i+1}'
            # include data-label for responsive card-style view
            html.append(f'<td data-label="{label}">{cell}</td>')
        html.append('</tr>')
    html.append('</tbody></table></div></section>')
    return '\n'.join(html)

def main():
    # Allow optional override URL; default to Trucks series
    url = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_URL
    print(f"[fetch_standings] {datetime.utcnow().isoformat()}Z fetching: {url}")
    try:
        r = requests.get(url, timeout=20, headers={"User-Agent":"CRL Standings Fetcher/1.0"})
        r.raise_for_status()
    except Exception as e:
        print(f"[fetch_standings] ERROR: failed to GET source URL: {e}")
        sys.exit(2)

    soup = BeautifulSoup(r.text, 'html.parser')

    # specifically extract drivers_table and team_table if present
    # SimRacerHub uses ids 'driver_table' / 'team_table' for classic view
    drivers = soup.find(id='driver_table')
    teams = soup.find(id='team_table')
    if not drivers:
        print('[fetch_standings] WARNING: driver_table not found in source HTML')
    if not teams:
        print('[fetch_standings] WARNING: team_table not found in source HTML')

    # prepare HTML fragments
    drivers_html = ''
    teams_html = ''
    # base to prefix driver links with
    base = 'https://www.simracerhub.com/scoring/'

    def rewrite_links(node):
        # find all anchor tags and rewrite hrefs that point to driver_stats.php
        for a in node.find_all('a', href=True):
            href = a['href']
            # ignore already-absolute URLs
            if href.startswith('http'):
                continue
            if 'driver_stats.php' in href:
                # find the driver_stats.php portion and append the remainder to base
                idx = href.find('driver_stats.php')
                new_href = base + href[idx:]
                a['href'] = new_href
    if drivers:
        # rewrite driver links to absolute scoring URLs
        rewrite_links(drivers)
        # ensure the extracted element is treated as a wide standings table
        try:
            # if it's a table tag, add our standings class and a min-width style
            if drivers.name == 'table':
                # add class (preserve existing classes)
                existing = drivers.get('class', [])
                if 'standings-table' not in existing:
                    existing.append('standings-table')
                    drivers['class'] = existing
                # ensure a minimum width so the wrapper can scroll
                cur_style = drivers.get('style', '')
                if 'min-width' not in cur_style:
                    drivers['style'] = (cur_style + ';min-width:700px;').strip(';')
        except Exception:
            pass
        # ensure horizontal-scroll wrapper is present
        drivers_html = str(drivers)
        if 'class="table-wrap"' not in drivers_html:
            drivers_html = '<div class="table-wrap">\n' + drivers_html + '\n</div>'
    if teams:
        # rewrite any driver links in teams as well
        rewrite_links(teams)
        try:
            if teams.name == 'table':
                existing = teams.get('class', [])
                if 'standings-table' not in existing:
                    existing.append('standings-table')
                    teams['class'] = existing
                cur_style = teams.get('style', '')
                if 'min-width' not in cur_style:
                    teams['style'] = (cur_style + ';min-width:700px;').strip(';')
        except Exception:
            pass
        teams_html = str(teams)
        if 'class="table-wrap"' not in teams_html:
            teams_html = '<div class="table-wrap">\n' + teams_html + '\n</div>'

    # inject into trucks/index.html between markers
    trucks_path = Path('trucks/index.html')
    if not trucks_path.exists():
        print('trucks/index.html not found in project root')
        sys.exit(1)

    trucks_text = trucks_path.read_text(encoding='utf-8')

    def inject_between(text, start_marker, end_marker, replacement):
        start = text.find(start_marker)
        end = text.find(end_marker)
        if start == -1 or end == -1 or end < start:
            return text
        before = text[:start+len(start_marker)]
        after = text[end:]
        return before + '\n' + replacement + '\n' + after

    trucks_text = inject_between(trucks_text, '<!-- START_DRIVERS -->', '<!-- END_DRIVERS -->', drivers_html or '<p>No drivers table found.</p>')
    trucks_text = inject_between(trucks_text, '<!-- START_TEAMS -->', '<!-- END_TEAMS -->', teams_html or '<p>No team table found.</p>')

    trucks_path.write_text(trucks_text, encoding='utf-8')
    print('[fetch_standings] Updated', trucks_path)
    print('[fetch_standings] Done.')

if __name__ == '__main__':
    main()
