#!/bin/bash
cd ~/Projects/utah-pollinator-path

# Log file
LOG="data/expanded_cache/collector_v2.log"

echo "[$(date)] Starting improved GBIF collector..." | tee -a $LOG

# Run with nohup so it survives terminal close
nohup caffeinate -i python3 build_cache_gbif_v2.py >> $LOG 2>&1 &

echo "[$(date)] Collector started with PID $!" | tee -a $LOG
echo "Monitor with: tail -f $LOG"
