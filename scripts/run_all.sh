#!/usr/bin/env bash
# Build every stunt end to end (fresh world each), logging to work/<stunt>.log.
cd "$(dirname "$0")/.."
for s in ${STUNTS:-water_clutch looks_wrong villager_job pearl_clutch}; do
  echo "=== $s $(date +%H:%M:%S)"
  ( time STUNT=$s ./run.sh ) > "work/$s.log" 2>&1; echo "exit=$?" >> "work/$s.log"
  grep -E "STUNT|rendered|song drop|wrote out|real|exit=" "work/$s.log"
done
