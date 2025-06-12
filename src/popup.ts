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
import GLib from "gi://GLib";
import GObject from "gi://GObject";
import St from "gi://St";
import { Extension, gettext as _ } from "resource:///org/gnome/shell/extensions/extension.js";
import * as Main from "resource:///org/gnome/shell/ui/main.js";
import * as PanelMenu from "resource:///org/gnome/shell/ui/panelMenu.js";
import * as PopupMenu from "resource:///org/gnome/shell/ui/popupMenu.js";
import { Config } from "./config.js";
import { Weather } from "./weather.js";
import { displayTemp } from "./utils.js";

export class Popup {

    readonly #config : Config;

    #condition : St.Icon;
    #temp : St.Label;

    constructor(config : Config, menu : PopupMenu.PopupMenu) {
        this.#config = config;

        this.#condition = new St.Icon({
            icon_name: "weather-clear-symbolic",
            style_class: "simpleweather-popup-icon"
        });
        this.#temp = new St.Label({
            text: "0\u00B0",
            style_class: "simpleweather-popup-temp"
        });

        const hbox = new St.BoxLayout({ vertical: false });

        const leftVBox = new St.BoxLayout({ vertical: true });
        leftVBox.add_child(this.#condition);
        leftVBox.add_child(this.#temp);

        hbox.add_child(leftVBox);

        const childItem = new PopupMenu.PopupBaseMenuItem({ reactive: false });
        childItem.actor.add_child(hbox);

        menu.addMenuItem(childItem);
    }

    destroy(menu : PopupMenu.PopupMenu) {
        menu.firstMenuItem.destroy();
    }

    updateGui(w : Weather) {
        this.#condition.icon_name = w.gIconName;
        this.#temp.text = displayTemp(w, this.#config);
    }

}
