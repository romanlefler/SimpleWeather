/*
    Copyright 2026 Roman Lefler

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

import Clutter from "gi://Clutter";
import { ExtensionMetadata } from "resource:///org/gnome/shell/extensions/extension.js";
import { Config, PopupLayout as PopupLayoutPreset } from "../config.js";
import { Weather } from "../weather.js";
import { ClassicLayout } from "./classic.js";
import { DefaultLayout } from "./defaultlayout.js";

export interface PopupLayout {
    readonly actor : Clutter.Actor;
    updateGui(weather : Weather) : void;
    destroy() : void;
}

export interface PopupLayoutArgs {
    config : Config;
    metadata : ExtensionMetadata;
}

export function createPopupLayout(preset : PopupLayoutPreset, args : PopupLayoutArgs) : PopupLayout {
    switch(preset) {
        case PopupLayoutPreset.Default:
            return new DefaultLayout(args);
        case PopupLayoutPreset.Classic:
            return new ClassicLayout(args);
    }
}
