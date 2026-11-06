/*
    Copyright 2025 Roman Lefler

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.
*/

import Gio from "gi://Gio";
import St from "gi://St";
import type { ExtensionMetadata } from "resource:///org/gnome/shell/extensions/extension.js";
import { getWeatherGIcon } from "../icons.js";

const DEFAULT_POPUP_ICON_SIZE = 64;
const ICON_LOOKUP_FLAGS_NONE = 0;

let iconTheme : St.IconTheme | undefined;

export function watchWeatherIconTheme(callback : () => void) : () => void {
    const theme = iconTheme ??= new St.IconTheme();
    const signalId = theme.connect("changed", callback);
    return () => theme.disconnect(signalId);
}

export function createWeatherIcon(
    metadata : ExtensionMetadata,
    name : string,
    packaged = false,
    size = DEFAULT_POPUP_ICON_SIZE
) : Gio.Icon {
    const icon = getWeatherGIcon(name, metadata.path, { packaged });
    if(packaged) return icon;

    iconTheme ??= new St.IconTheme();
    const filename = iconTheme.lookup_by_gicon(icon, size, ICON_LOOKUP_FLAGS_NONE)?.get_filename();
    if(!filename?.endsWith(".svg")) return icon;

    return new Gio.FileIcon({ file: Gio.File.new_for_path(filename) });
}
