#!/bin/sh

UUID=$(awk -F'"' '/uuid/ { print $4 }' ./info/metadata.json)
rm -rf $HOME/.local/share/gnome-shell/extensions/$UUID

make clean
make install

# export G_MESSAGES_DEBUG=all
export MUTTER_DEBUG_DUMMY_MODE_SPECS=1280x1024
export SHELL_DEBUG=all
dbus-run-session -- gnome-shell --nested --wayland
