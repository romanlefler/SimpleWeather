/*
    Copyright 2025 Roman Lefler

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.
*/

import Gio from "gi://Gio";
import type { ExtensionMetadata } from "resource:///org/gnome/shell/extensions/extension.js";
import { getWeatherGIcon } from "../icons.js";

export function createWeatherIcon(
    metadata : ExtensionMetadata,
    name : string,
    packaged = false
) : Gio.Icon {
    return getWeatherGIcon(name, metadata.path, { packaged });
}
