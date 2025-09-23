#!/bin/bash
set -e

UUID=$(awk -F'"' '/uuid/ { print $4 }' ./static/metadata.json)
rm -rf $HOME/.local/share/gnome-shell/extensions/$UUID

make install

# export G_MESSAGES_DEBUG=all
export MUTTER_DEBUG_DUMMY_MODE_SPECS=1280x1024
export SHELL_DEBUG=all

echo
v="$(gnome-shell --version 2>/dev/null | grep -oE '[0-9]+(\.[0-9]+)*' || true)"
echo "Testing on $v."
if [[ "${v%%.*}" -lt 49 ]]; then
    dbus-run-session -- gnome-shell --nested --wayland
else
    printf "\033[44mMutter dev package is required.\033[0m\n"
    dbus-run-session -- gnome-shell --devkit
fi
