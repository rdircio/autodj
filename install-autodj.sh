#!/usr/bin/env bash
#
# Install AutoDJ.js into Mixxx's user controllers folder.
# Run from the repo root: ./install-autodj.sh
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE="${SCRIPT_DIR}/AutoDJ.js"

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

DEST="${CONTROLLERS_DIR}/AutoDJ.js"

if [[ ! -f "$SOURCE" ]]; then
  echo "Error: AutoDJ.js not found at $SOURCE" >&2
  exit 1
fi

mkdir -p "$CONTROLLERS_DIR"
cp "$SOURCE" "$DEST"
echo "Installed: $DEST"
echo "Restart Mixxx (or reload the controller) to use the updated script."
