#!/bin/bash

GOVERNOR="$1"

if [ -z "$GOVERNOR" ]; then
    exit 1
fi

for cpu in /sys/devices/system/cpu/cpu[0-9]*; do
    if [ -w "$cpu/cpufreq/scaling_governor" ]; then
        echo "$GOVERNOR" > "$cpu/cpufreq/scaling_governor"
    fi
done
