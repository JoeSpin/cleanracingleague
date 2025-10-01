Standings fetcher
=================

This workspace includes a small script to fetch standings from a SimRacerHub standings page and generate a responsive `standings.html`.

Requirements
- Python 3.8+
- pip install requests beautifulsoup4

Run
- From project root (defaults to Trucks series URL automatically):
  - python tools/fetch_standings.py
- Override with a different SimRacerHub standings URL:
  - python tools/fetch_standings.py "https://www.simracerhub.com/scoring/season_standings.php?series_id=YOUR_SERIES_ID"

Output
- `standings.html` will be written at the project root and includes `css/standings.css` for responsive styling.

Scheduled updates
- Windows (Task Scheduler):
  - Use `tools/update_standings.ps1` as the action script. Create a basic task that runs every N minutes/hours. Ensure "Start in" path is the repo root and run with a user that has Python available.

- Linux/macOS (cron):
  - Make `tools/update_standings.sh` executable: `chmod +x tools/update_standings.sh`.
  - Add a cron entry (example: every 15 minutes):
    - */15 * * * * /path/to/repo/tools/update_standings.sh

Notes
- The parser targets elements with ids `driver_table` and `team_table`. If SimRacerHub changes structure, adjustments may be required.
- Logs (when using scheduled scripts) are written to `logs/update_standings_*.log`.
- Driver links are rewritten to absolute scoring URLs.

Elite Series
------------
An additional script `tools/fetch_elite_standings.py` targets the Elite series (series_id=13239) and injects tables directly into `elite/index.html` between marker comments:

```
<!-- START_DRIVERS --> ... <!-- END_DRIVERS -->
<!-- START_TEAMS --> ... <!-- END_TEAMS -->
```

Usage:

```
python tools/fetch_elite_standings.py
```

Override source URL (e.g. if series id changes):

```
python tools/fetch_elite_standings.py "https://www.simracerhub.com/scoring/season_standings.php?series_id=NEWID"
```

You can schedule both scripts similarly (create a second scheduled task / cron job for the Elite script).

ARCA Series
-----------
Script: `tools/fetch_arca_standings.py` (series_id=12526) injects standings into `arca/index.html` using the same marker pattern:

```
<!-- START_DRIVERS --> ... <!-- END_DRIVERS -->
<!-- START_TEAMS --> ... <!-- END_TEAMS -->
```

Usage:

```
python tools/fetch_arca_standings.py
```

Override source URL:

```
python tools/fetch_arca_standings.py "https://www.simracerhub.com/scoring/season_standings.php?series_id=NEWID"
```

Scheduling is identical; create a third task/cron entry if desired.
