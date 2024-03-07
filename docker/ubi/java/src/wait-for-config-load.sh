#!/bin/bash

# Wait for config load to be complete before executing the main entrypoint
# If WAIT_CONFIG_LOAD is not set or 0, then the check is skipped

if [[ "$#" -lt 1 ]]; then
    echo $0: Exiting since we expect at least 1 argument and $# were passed
    exit 1
fi

if [[ -n ${WAIT_CONFIG_LOAD} ]]; then
    URL="http://config-loader:8080/config-loader/initialized"
    echo "$0: Waiting for config-loader to be initialized"
    echo "$0: Curling ${URL}"
    while true; do
        response=$(curl -s --insecure --max-time 1 ${URL} | tr -d '"')
        echo "$0: response: ${response}"
        if [[ "${response}" == "loaded" ]]; then
            break
        fi
        sleep 5
    done
fi

echo "$0: Starting the main entrypoint..."
exec "$@"