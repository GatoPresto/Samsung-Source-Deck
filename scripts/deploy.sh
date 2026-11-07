#!/usr/bin/env bash
# Build, sign, install and launch Source Deck on the TV. Leaves exactly one package: build/SourceDeck.wgt.
#   scripts/deploy.sh            package + install + run
#   scripts/deploy.sh --no-run   package + install
#   scripts/deploy.sh --build    package only
# Override the defaults with env vars: PROFILE, TV_IP, TV_NAME.
set -euo pipefail

PROFILE="${PROFILE:-GatoPresto}"
TV_IP="${TV_IP:-192.168.50.204}"
TV_NAME="${TV_NAME:-QE77S95CAUXUA}"          # as shown by `sdb devices`
APP_ID="SrcDeck001.SourceDeck"
TIZEN="$HOME/tizen-studio/tools/ide/bin/tizen"
SDB="$HOME/tizen-studio/tools/sdb"

cd "$(dirname "$0")/.."
rm -rf build && mkdir build
rm -f app/*signature*.xml app/.manifest.tmp

# `tizen package` names the file after the app ("Source Deck.wgt"); a space in the name makes `tizen install` fail,
# and it has no output-name option, so rename it (move, not copy: one package only).
"$TIZEN" package -t wgt -s "$PROFILE" -o "$PWD/build" -- app >/dev/null
mv "build/Source Deck.wgt" build/SourceDeck.wgt
rm -f app/*signature*.xml app/.manifest.tmp      # packaging leaves these in app/
echo "Built build/SourceDeck.wgt"
[ "${1:-}" = "--build" ] && exit 0

"$SDB" connect "$TV_IP" | tail -1
"$TIZEN" install -n SourceDeck.wgt -t "$TV_NAME" -- "$PWD/build" | tail -2
[ "${1:-}" = "--no-run" ] && exit 0
"$TIZEN" run -p "$APP_ID" -t "$TV_NAME" | tail -1
