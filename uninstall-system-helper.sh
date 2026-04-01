#!/bin/bash
set -e

echo "[CPU Governor] Uninstalling system helper..."

SERVICE_NAME="cpu-governor.service"
SERVICE_PATH="/etc/systemd/system/$SERVICE_NAME"
DISPATCH_PATH="/usr/local/bin/cpu-governor-dispatch"
STATE_DIR="/var/lib/cpu-governor"
REQUEST_FILE="$STATE_DIR/request"

# Stop + disable service safely
systemctl stop "$SERVICE_NAME" 2>/dev/null || true
systemctl disable "$SERVICE_NAME" 2>/dev/null || true

# Remove installed files
rm -f "$SERVICE_PATH"
rm -f "$DISPATCH_PATH"
rm -f "$REQUEST_FILE"

# Remove state dir if empty
rmdir "$STATE_DIR" 2>/dev/null || true

# Reload systemd state
systemctl daemon-reload
systemctl reset-failed

echo "[CPU Governor] Uninstall complete."
