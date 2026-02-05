#!/bin/bash

# Galaxy Empire Game Tick Script
# This script runs the game tick procedure 60 times per minute
# to process completed buildings, research, ship construction, and resource production

echo "Starting game tick loop at $(date)"

# Run game tick 60 times (once per second for a minute)
for i in {1..60}; do
    psql "postgres://galaxy_user:galaxy_password@localhost:5432/galaxy_empire" -c "CALL game_tick();" >/dev/null 2>&1
    sleep 1
done

echo "Game tick loop completed at $(date)"