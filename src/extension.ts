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
import St from 'gi://St';
import { Extension } from "resource:///org/gnome/shell/extensions/extension.js";
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import { Provider } from "./providers/provider.js";
import { OpenMeteo } from "./providers/openmeteo.js";
import { LibSoup } from "./libsoup.js";
import { TempUnits } from "./units.js";

export default class SimpleWeatherExtension extends Extension {

    #gsettings? : Gio.Settings;
    #indicator? : PanelMenu.Button;
    #panelLabel? : St.Label;

    #libsoup? : LibSoup;
    #provider? : Provider;
    #fetchLoopId? : number;

    enable() {
        this.#gsettings = this.getSettings();
        this.#libsoup = new LibSoup();
        this.#provider = new OpenMeteo(this.#libsoup);

        this.#indicator = new PanelMenu.Button(0.0, "Weather", false);

        this.#panelLabel = new St.Label({
            text: "...",
            y_align: Clutter.ActorAlign.CENTER,
            y_expand: true
        });
        this.#indicator.add_child(this.#panelLabel);

        Main.panel.addToStatusArea(this.uuid, this.#indicator);

        this.#fetchLoopId = GLib.timeout_add_seconds(
            GLib.PRIORITY_DEFAULT,
            15 * 60,
            this.#updateWeather
        );
        this.#updateWeather();
    }

    disable() {
        if(this.#fetchLoopId) {
            GLib.source_remove(this.#fetchLoopId);
            this.#fetchLoopId = undefined;
        }

        this.#gsettings = undefined;
        this.#indicator?.destroy();
        this.#indicator = undefined;
        this.#libsoup?.free();
        this.#libsoup = undefined;
        this.#provider = undefined;
    }

    #updateWeather() {
        this.#updateWeatherAsync().catch(err => {
            console.error(err);
        });
        return GLib.SOURCE_CONTINUE;
    }

    async #updateWeatherAsync() {

        if(!this.#provider) throw new Error("Provider was undefined!");
        const w = await this.#provider!.fetchWeather();

        this.#panelLabel!.text = `${Math.round(w.temp.get(TempUnits.Fahrenheit))}\u00B0`;

    }

}
