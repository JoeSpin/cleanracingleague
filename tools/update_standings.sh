#!/usr/bin/env bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
URL='https://www.simracerhub.com/scoring/season_standings.php?series_id=10554&ifn=1'
LOGDIR="$SCRIPT_DIR/../logs"
mkdir -p "$LOGDIR"
LOGFILE="$LOGDIR/update_standings_$(date +'%Y%m%d_%H%M%S').log"

echo "Starting standings update: $(date)" | tee -a "$LOGFILE"
python3 "$SCRIPT_DIR/fetch_standings.py" "$URL" 2>&1 | tee -a "$LOGFILE"
echo "Finished standings update: $(date)" | tee -a "$LOGFILE"
