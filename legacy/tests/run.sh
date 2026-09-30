#!/bin/bash
cd /home/claude/deploy-test
SITE_DIR=${SITE_DIR:-/home/claude/site} API_DIR=${API_DIR:-/home/claude/deploy/api} STORE_DIR=/home/claude/deploy-test/store SESSION_SECRET=$(python3 -c "print('x'*48)") PORT=4321 node dev.mjs > dev.log 2>&1 &
PID=$!; for i in $(seq 1 30); do curl -s localhost:4321/api/session >/dev/null && break; sleep 0.2; done
"$@"; RC=$?; kill $PID; exit $RC
