#!/bin/sh
set -eu

URL="https://github.com/romanlefler/readme-tools"
DIR="./.readme-tools"
IMGOUT="./docs/assets/transl.png"

THEME="seaborn-v0_8-whitegrid"

echo '### Creating Translation Progress Figure for README ###'

if [ ! -d "$DIR" ]; then
    echo 'Getting readme-tools...'
    git clone "$URL" "$DIR"
    echo 'Finished getting readme-tools.'
else
    echo 'Found readme-tools; checking for updates...'
    git -C "$DIR" pull
    echo 'Finished checking for readme-tools updates.'
fi

echo 'Making figure.'
"$DIR"/cli/readme-pochart -0 -r'2:1' -y'0.2' -t"$THEME" ./po/*.po "$IMGOUT"

