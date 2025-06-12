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
import { Config } from "./config.js";
import { Weather } from "./weather.js";
import { delayTask, displayTemp, removeSourceIfTruthy } from "./utils.js";
import { freeMyLocation, setUpMyLocation } from "./myLocation.js";
import { setUpGettext } from "./gettext.js";
import { gettext as shellGettext } from "resource:///org/gnome/shell/extensions/extension.js";
import { Popup } from "./popup.js";
import { PopupMenu } from "resource:///org/gnome/shell/ui/popupMenu.js";

export default class SimpleWeatherExtension extends Extension {

    #gsettings? : Gio.Settings;
    #indicator? : PanelMenu.Button;
    #panelLabel? : St.Label;
    #panelIcon? : St.Icon;
    #popup? : Popup;

    #cachedWeather? : Weather;
    #config? : Config;
    #libsoup? : LibSoup;
    #provider? : Provider;

    #fetchLoopId? : number;
    #delayFetchId? : number;
    #resolverFailCount : number = 0;

    enable() {
        setUpGettext(shellGettext);
        this.#gsettings = this.getSettings();
        this.#config = new Config(this.#gsettings);
        this.#libsoup = new LibSoup();
        this.#provider = new OpenMeteo(this.#libsoup, this.#config);
        setUpMyLocation(this.#libsoup, this.#config);

        this.#indicator = new PanelMenu.Button(0, "Weather", false);
        this.#popup = new Popup(this.#config, this.#indicator.menu as PopupMenu);

        const layout = new St.BoxLayout({
            orientation: Clutter.Orientation.HORIZONTAL
        });
        this.#panelLabel = new St.Label({
            text: "...",
            y_align: Clutter.ActorAlign.CENTER,
            y_expand: true
        });
        this.#panelIcon = new St.Icon({
            icon_name: "view-refresh-symbolic",
            style_class: "system-status-icon"
        });
        layout.add_child(this.#panelLabel);
        layout.add_child(this.#panelIcon);
        this.#indicator.add_child(layout);

        Main.panel.addToStatusArea(this.uuid, this.#indicator);

        this.#fetchLoopId = GLib.timeout_add_seconds(
            GLib.PRIORITY_DEFAULT,
            15 * 60,
            this.#updateWeather.bind(this)
        );
        this.#config.onMainLocationChanged(this.#updateWeather.bind(this));

        this.#config.onTempUnitChanged(this.#updateGui.bind(this));
        this.#updateWeather();
    }

    disable() {
        this.#fetchLoopId = removeSourceIfTruthy(this.#fetchLoopId);
        this.#delayFetchId = removeSourceIfTruthy(this.#delayFetchId);

        if(this.#popup && this.#indicator) {
            this.#popup.destroy(this.#indicator.menu as PopupMenu);
            this.#popup = undefined;
        }
        this.#panelIcon = undefined;
        this.#panelLabel = undefined;
        this.#indicator?.destroy();
        this.#indicator = undefined;

        this.#gsettings = undefined;
        this.#libsoup?.free();
        this.#libsoup = undefined;
        this.#config?.free();
        this.#config = undefined;

        freeMyLocation();
        this.#provider = undefined;
        this.#cachedWeather = undefined;
    }

    #updateWeather() {
        this.#updateWeatherAsync().then(() => {
            this.#resolverFailCount = 0;
        }).catch(err => {
            console.error(err);
            // This happens on boot presumably when things are loaded
            // out of order, try max 3 times
            if(err instanceof Gio.ResolverError && ++this.#resolverFailCount <= 3) {
                this.#delayFetchId = delayTask(5.0, () => {
                    this.#delayFetchId = undefined;
                    this.#updateWeather();
                });
            }
        });
        return GLib.SOURCE_CONTINUE;
    }

    async #updateWeatherAsync() {

        if(!this.#provider) throw new Error("Provider was undefined!");
        this.#cachedWeather = await this.#provider!.fetchWeather();
        this.#updateGui();
    }

    #updateGui() {
        const w = this.#cachedWeather;
        if(!w) return;

        this.#panelLabel!.text = displayTemp(w, this.#config!);

        this.#panelIcon!.icon_name = w.gIconName;

        this.#popup!.updateGui(w);
    }

}
