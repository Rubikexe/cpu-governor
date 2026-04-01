#!/bin/bash
set -e

echo "[CPU Governor] Installing system helper..."

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

INSTALL_DIR="/usr/local/bin"
DISPATCH_SOURCE="$SCRIPT_DIR/cpu-governor-dispatch.sh"
DISPATCH_TARGET="$INSTALL_DIR/cpu-governor-dispatch"

SERVICE_SOURCE="$SCRIPT_DIR/cpu-governor.service"
SERVICE_TARGET="/etc/systemd/system/cpu-governor.service"

STATE_DIR="/var/lib/cpu-governor"
REQUEST_FILE="$STATE_DIR/request"

# === Validate source files ===
if [ ! -f "$DISPATCH_SOURCE" ]; then
    echo "[CPU Governor] ERROR: Missing dispatcher source: $DISPATCH_SOURCE"
    exit 1
fi

if [ ! -f "$SERVICE_SOURCE" ]; then
    echo "[CPU Governor] ERROR: Missing systemd service file: $SERVICE_SOURCE"
    exit 1
fi

# === Ensure inotifywait exists ===
if ! command -v inotifywait >/dev/null 2>&1; then
    echo "[CPU Governor] inotifywait not found. Installing inotify-tools..."

    if command -v apt >/dev/null 2>&1; then
        apt update
        apt install -y inotify-tools
    else
        echo "[CPU Governor] ERROR: Unsupported package manager. Please install inotify-tools manually."
        exit 1
    fi
fi

# === Install dispatcher ===
install -Dm755 "$DISPATCH_SOURCE" "$DISPATCH_TARGET"

# === Install systemd service ===
install -Dm644 "$SERVICE_SOURCE" "$SERVICE_TARGET"

# === Create state directory and request file ===
mkdir -p "$STATE_DIR"
touch "$REQUEST_FILE"
chmod 666 "$REQUEST_FILE"

# === Reload systemd ===
systemctl daemon-reexec
systemctl daemon-reload

# === Enable and start service ===
systemctl enable cpu-governor.service
systemctl restart cpu-governor.service

echo "[CPU Governor] Installation complete."
