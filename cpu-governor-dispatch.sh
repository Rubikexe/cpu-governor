#!/bin/bash
set -e

STATE_DIR="/var/lib/cpu-governor"
COMMAND_FILE="$STATE_DIR/request"

mkdir -p "$STATE_DIR"
touch "$COMMAND_FILE"
chmod 666 "$COMMAND_FILE"

apply_governor() {
    local GOV="$1"

    case "$GOV" in
        powersave|schedutil|performance)
            ;;
        *)
            echo "[CPU Governor] Ignoring invalid governor: $GOV"
            return
            ;;
    esac

    echo "[CPU Governor] Applying governor: $GOV"

    for cpu in /sys/devices/system/cpu/cpu[0-9]*; do
        GOV_PATH="$cpu/cpufreq/scaling_governor"

        if [ -w "$GOV_PATH" ]; then
            echo "$GOV" > "$GOV_PATH" 2>/dev/null || true
        fi
    done
}

if ! command -v inotifywait >/dev/null 2>&1; then
    echo "[CPU Governor] ERROR: inotifywait is not installed. Please install inotify-tools."
    exit 1
fi

echo "[CPU Governor] Watching $STATE_DIR for governor changes..."

# Apply current value on startup (if any)
CURRENT_GOV=$(tr -d '\n' < "$COMMAND_FILE" 2>/dev/null || true)
if [ -n "$CURRENT_GOV" ]; then
    apply_governor "$CURRENT_GOV"
fi

# Watch for changes
while inotifywait -e modify -e close_write -e moved_to -e create "$STATE_DIR" >/dev/null 2>&1; do
    GOV=$(tr -d '\n' < "$COMMAND_FILE" 2>/dev/null || true)

    if [ -n "$GOV" ]; then
        apply_governor "$GOV"
    fi
done
