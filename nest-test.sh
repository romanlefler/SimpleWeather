#!/bin/sh

make install

export MUTTER_DEBUG_DUMMY_MODE_SPECS=1280x1024
export SHELL_DEBUG=all
dbus-run-session -- gnome-shell --nested --wayland
