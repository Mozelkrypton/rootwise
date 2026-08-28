#!/usr/bin/env bash
# RootWise ESP32 flash helper — run from Terminal.app OUTSIDE Cursor (Cmd+Q Cursor first).
set -euo pipefail

export PATH="$HOME/Library/Python/3.9/bin:$PATH"
cd "$(dirname "$0")"

PORT="${UPLOAD_PORT:-}"
if [[ -z "$PORT" ]]; then
  PORT="$(pio device list 2>/dev/null | awk '/usbmodem|usbserial/{print $1; exit}')"
fi

if [[ -z "$PORT" ]]; then
  echo "No ESP32 USB port found. Plug in the board and retry."
  exit 1
fi

echo "Target port: $PORT"
echo ""
echo "If upload fails with 'Resource busy' / 'Line in use':"
echo "  1. Quit Cursor completely (Cmd+Q), not just close the terminal tab"
echo "  2. Unplug the ESP32 USB cable, wait 5 seconds, plug into a direct USB port"
echo "  3. Press Enter here to retry"
echo ""

port_open() {
  python3 - "$PORT" <<'PY'
import sys, serial
try:
    s = serial.Serial(sys.argv[1], 115200, timeout=0.5)
    s.close()
    sys.exit(0)
except Exception:
    sys.exit(1)
PY
}

TRIES=0
until port_open; do
  TRIES=$((TRIES + 1))
  if [[ $TRIES -gt 5 ]]; then
    echo "Port still busy after $TRIES attempts."
    echo "Try: sudo lsof $PORT"
    echo "Or reboot the Mac, then run this script again before opening Cursor."
    exit 1
  fi
  read -r -p "Port busy. Unplug/replug ESP32, quit Cursor, then press Enter to retry..."
done

echo "Port open — flashing..."
pio run -e esp32dev -t upload --upload-port "$PORT"
echo ""
echo "Flash complete. Starting serial monitor (Ctrl+C to exit)..."
pio device monitor -b 115200 --port "$PORT"
