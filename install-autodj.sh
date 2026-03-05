#!/usr/bin/env bash
#
# Install AutoDJ.js into Mixxx's user controllers folder.
# Run from the repo root: ./install-autodj.sh
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_JS="${SCRIPT_DIR}/AutoDJ.js"
SOURCE_XML="${SCRIPT_DIR}/AutoDJ.midi.xml"

# Detect platform and choose Mixxx user controllers directory
OS="$(uname -s)"
case "$OS" in
  Darwin)
    # macOS (Mixxx 2.3+ from the App Store / bundle)
    CONTROLLERS_DIR="${HOME}/Library/Containers/org.mixxx.mixxx/Data/Library/Application Support/Mixxx/controllers"
    ;;
  Linux)
    # Linux (default Mixxx settings dir)
    CONTROLLERS_DIR="${HOME}/.mixxx/controllers"
    ;;
  *)
    echo "Error: unsupported OS '$OS'. Please copy AutoDJ.js to your Mixxx controllers folder manually." >&2
    exit 1
    ;;
esac

DEST_JS="${CONTROLLERS_DIR}/AutoDJ.js"
DEST_XML="${CONTROLLERS_DIR}/AutoDJ.midi.xml"

if [[ ! -f "$SOURCE_JS" ]]; then
  echo "Error: AutoDJ.js not found at $SOURCE_JS" >&2
  exit 1
fi

mkdir -p "$CONTROLLERS_DIR"
cp "$SOURCE_JS" "$DEST_JS"
echo "Installed: $DEST_JS"
if [[ -f "$SOURCE_XML" ]]; then
  cp "$SOURCE_XML" "$DEST_XML"
  echo "Installed: $DEST_XML"
fi
echo "Restart Mixxx (or reload the controller) to use the updated script."
echo "To get the preferences dialog: select the 'AutoDJ (Script)' mapping for your MIDI device in Preferences > Controllers."
