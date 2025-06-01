/*
    Copyright 2025 Roman Lefler

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
import Gio from "gi://Gio";
import St from 'gi://St';
import { Extension } from "resource:///org/gnome/shell/extensions/extension.js";
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';

export default class SimpleWeatherExtension extends Extension {

    #gsettings? : Gio.Settings;
    #indicator? : PanelMenu.Button;
    #panelLabel? : St.Label;

    enable() {
        this.#gsettings = this.getSettings();

        this.#indicator = new PanelMenu.Button(0.0, "Weather", false);

        this.#panelLabel = new St.Label({
            text: "Test",
            "y_align": Clutter.ActorAlign.CENTER,
            y_expand: true
        });
        this.#indicator.add_child(this.#panelLabel);

        Main.panel.addToStatusArea(this.uuid, this.#indicator);
    }

    disable() {
        this.#gsettings = undefined;

        this.#indicator?.destroy();
        this.#indicator = undefined;
    }

}
