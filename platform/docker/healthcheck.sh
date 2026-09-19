#!/bin/sh
# ============================================================
# GAMING PLATFORM — DOCKER HEALTH CHECK SCRIPT
# Used by Docker HEALTHCHECK directive in Dockerfiles
# ============================================================

set -e

# Configuration
HEALTH_PORT="${PORT:-4000}"
HEALTH_ENDPOINT="/health"
HEALTH_ENDPOINT_ALT="/api/v1/health"
TIMEOUT=5

# Check if the application is responding
check_http() {
    wget --no-verbose --tries=1 --timeout="$TIMEOUT" \
        -q -O - "http://localhost:${HEALTH_PORT}${HEALTH_ENDPOINT}" 2>/dev/null
    local rc=$?
    if [ "$rc" -ne 0 ] && [ -n "$HEALTH_ENDPOINT_ALT" ]; then
        wget --no-verbose --tries=1 --timeout="$TIMEOUT" \
            -q -O - "http://localhost:${HEALTH_PORT}${HEALTH_ENDPOINT_ALT}" 2>/dev/null
        rc=$?
    fi
    return $rc
}

# Check if the node process is running
check_process() {
    pgrep -x node > /dev/null 2>&1
    return $?
}

# Perform health check
main() {
    # First check if process is alive
    if ! check_process; then
        echo "UNHEALTHY: Node process not running"
        exit 1
    fi

    # Then check HTTP endpoint
    if check_http; then
        echo "HEALTHY"
        exit 0
    else
        echo "UNHEALTHY: HTTP check failed on port ${HEALTH_PORT}"
        exit 1
    fi
}

main
