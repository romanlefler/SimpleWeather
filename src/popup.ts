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
import { Extension, ExtensionMetadata, gettext as _ } from "resource:///org/gnome/shell/extensions/extension.js";
import * as Main from "resource:///org/gnome/shell/ui/main.js";
import * as PanelMenu from "resource:///org/gnome/shell/ui/panelMenu.js";
import * as PopupMenu from "resource:///org/gnome/shell/ui/popupMenu.js";
import { Config } from "./config.js";
import { Weather } from "./weather.js";
import { displayDayOfWeek, displayTemp } from "./lang.js";
import { gettext as _g } from "./gettext.js";

interface ForecastCard {
    card : St.BoxLayout;
    day : St.Label;
    icon : St.Icon;
    high : St.Label;
    low : St.Label;
    rainChance : St.Label;
}

function createForecastCard() : ForecastCard {
    const card = new St.BoxLayout({
        vertical: true,
        x_expand: true,
        y_expand: true
    });

    const day = new St.Label({
        text: displayDayOfWeek(new Date()),
        x_align: Clutter.ActorAlign.CENTER
    });

    const icon = new St.Icon({
        icon_name: "view-refresh-symbolic",
        style_class: "simpleweather-card-icon",
        x_align: Clutter.ActorAlign.CENTER
    });

    const high = new St.Label({
        text: _g("H: %s").format("0\u00B0"),
        x_align: Clutter.ActorAlign.CENTER
    });

    const low = new St.Label({
        text: _g("L: %s").format("0\u00B0"),
        x_align: Clutter.ActorAlign.CENTER
    });

    const rainChance = new St.Label({
        text: "",
        x_align: Clutter.ActorAlign.CENTER
    });

    card.add_child(day);
    card.add_child(icon);
    card.add_child(high);
    card.add_child(low);
    card.add_child(rainChance);
    return {
        card,
        day,
        icon,
        high,
        low,
        rainChance
    };
}

export class Popup {

    readonly #config : Config;
    readonly #metadata : ExtensionMetadata;

    readonly #condition : St.Icon;
    readonly #temp : St.Label;
    readonly #forecastCards : ForecastCard[];

    constructor(config : Config, metadata : ExtensionMetadata, menu : PopupMenu.PopupMenu) {
        this.#config = config;
        this.#metadata = metadata;

        this.#condition = new St.Icon({
            icon_name: "weather-clear-symbolic",
            style_class: "simpleweather-popup-icon",
            x_align: Clutter.ActorAlign.CENTER
        });
        this.#temp = new St.Label({
            text: "0\u00B0",
            style_class: "simpleweather-popup-temp",
            x_align: Clutter.ActorAlign.CENTER
        });

        const hbox = new St.BoxLayout({ vertical: false });

        const leftVBox = new St.BoxLayout({
            vertical: true,
            style_class: "modal-dialog simpleweather-current"
        });
        leftVBox.add_child(this.#condition);
        leftVBox.add_child(this.#temp);

        hbox.add_child(leftVBox);

        const forecasts = new St.BoxLayout({
            vertical: false,
            x_expand: true,
            y_expand: false,
            style_class: "simpleweather-card-row"
        });
        this.#forecastCards = [ ];
        for(let i = 0; i < 7; i++) {
            const c = createForecastCard();
            forecasts.add_child(c.card);
            this.#forecastCards.push(c);
        }
        hbox.add_child(forecasts);

        const childItem = new PopupMenu.PopupBaseMenuItem({ reactive: false });
        childItem.actor.add_child(hbox);

        menu.addMenuItem(childItem);
    }

    destroy(menu : PopupMenu.PopupMenu) {
        menu.firstMenuItem.destroy();
    }

    #createIcon(s : string) : Gio.Icon {
        const iconPath = `${this.#metadata.path}/icons/${s}-symbolic.svg`;
        const iconFile = Gio.File.new_for_path(iconPath);
        return new Gio.FileIcon({ file: iconFile });
    }

    updateGui(w : Weather) {
        this.#condition.gicon = this.#createIcon(w.gIconName);
        this.#temp.text = displayTemp(w.temp, this.#config);

        this.#updateForecast(w);
    }

    #updateForecast(w : Weather) {
        const fore = w.forecast;
        for(let i = 0; i < this.#forecastCards.length; i++) {
            const c = this.#forecastCards[i];

            c.day.text = displayDayOfWeek(fore[i].date);
            c.icon.gicon = this.#createIcon(fore[i].gIconName);
            c.high.text = _g("H: %s").format(displayTemp(fore[i].tempMax, this.#config));
            c.low.text = _g("L: %s").format(displayTemp(fore[i].tempMin, this.#config));
            
            const rainChance = fore[i].precipChancePercent;
            // Round to multiple of 5
            const roundedRainChance = Math.round(rainChance / 5) * 5;
            // Only show chances >= 30%
            c.rainChance.text = rainChance >= 30 ? `${roundedRainChance}%` : "";
        }
    }

}
