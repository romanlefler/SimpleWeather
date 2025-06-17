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
import { Forecast, Weather } from "./weather.js";
import { displayDayOfWeek, displayTemp, displayTime } from "./lang.js";
import { gettext as _g } from "./gettext.js";

interface ForecastCard {
    card : St.BoxLayout;
    day : St.Label;
    icon : St.Icon;
    data1 : St.Label;
    data2 : St.Label;
    data3 : St.Label;
}

enum ForecastMode {
    Week = 0,
    SevenHours = 1,
    SecondPartOfDay = 2,

    Max = 2
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

    const data1 = new St.Label({
        text: "",
        x_align: Clutter.ActorAlign.CENTER
    });

    const data2 = new St.Label({
        text: "",
        x_align: Clutter.ActorAlign.CENTER
    });

    const data3 = new St.Label({
        text: "",
        x_align: Clutter.ActorAlign.CENTER
    });

    card.add_child(day);
    card.add_child(icon);
    card.add_child(data1);
    card.add_child(data2);
    card.add_child(data3);
    return {
        card,
        day,
        icon,
        data1,
        data2,
        data3
    };
}

function copyrightText(provName : string) : string {
    return `${_g("Weather Data")} \u00A9 ${provName} 2025`;
}

export class Popup {

    readonly #config : Config;
    readonly #metadata : ExtensionMetadata;

    readonly #condition : St.Icon;
    readonly #temp : St.Label;
    readonly #forecastCards : ForecastCard[];
    readonly #copyright : St.Label;

    #foreMode : ForecastMode;
    #cachedWeather? : Weather;

    constructor(config : Config, metadata : ExtensionMetadata, menu : PopupMenu.PopupMenu) {
        this.#config = config;
        this.#metadata = metadata;
        this.#foreMode = ForecastMode.Week;

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
            style_class: "simpleweather-card-row",
            reactive: true
        });
        this.#forecastCards = [ ];
        for(let i = 0; i < 7; i++) {
            const c = createForecastCard();
            forecasts.add_child(c.card);
            this.#forecastCards.push(c);
        }
        hbox.add_child(forecasts);

        forecasts.connect("button-press-event", () => {
            this.#foreMode++;
            if(this.#foreMode > ForecastMode.Max) this.#foreMode = 0;

            const w = this.#cachedWeather;
            if(w) this.#updateForecast(w);
        });

        const childItem = new PopupMenu.PopupBaseMenuItem({ reactive: false });
        childItem.actor.add_child(hbox);

        const textRect = new St.BoxLayout({
            vertical: false,
        });
        this.#copyright = new St.Label({
            text: ""
        });
        textRect.add_child(this.#copyright);

        const baseText = new PopupMenu.PopupBaseMenuItem({ reactive: false });
        baseText.actor.add_child(textRect);

        menu.addMenuItem(childItem);
        menu.addMenuItem(baseText);
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
        this.#copyright.text = copyrightText(w.providerName);

        this.#updateForecast(w);
    }

    #updateForecast(w : Weather) {
        this.#cachedWeather = w;

        const everyOtherHour = w.hourForecast.filter((_, i) => i % 2 === 0);

        const forecastArrs = [
            w.forecast,
            everyOtherHour,
            everyOtherHour.slice(7)
        ];
        const fore : Forecast[] = forecastArrs[this.#foreMode];

        for(let i = 0; i < this.#forecastCards.length; i++) {
            const c = this.#forecastCards[i];

            let dateText : string;
            if(this.#foreMode === ForecastMode.Week) dateText = displayDayOfWeek(fore[i].date);
            else dateText = displayTime(fore[i].date, this.#config, true);

            c.day.text = dateText;

            c.icon.gicon = this.#createIcon(fore[i].gIconName);

            const text : string[] = [ ];

            const temp = fore[i].temp;
            const tempMin = fore[i].tempMin;
            const tempMax = fore[i].tempMax;
            if(temp !== undefined) {
                text.push(displayTemp(temp, this.#config));
            }
            else if(tempMax !== undefined && tempMin !== undefined) {
                text.push(_g("H: %s").format(displayTemp(tempMax, this.#config)));
                text.push(_g("L: %s").format(displayTemp(tempMin, this.#config)));
            }
            
            const rainChance = fore[i].precipChancePercent;
            // Round to multiple of 5
            const roundedRainChance = Math.round(rainChance / 5) * 5;
            // Only show chances >= 30%
            text.push(rainChance >= 30 ? `${roundedRainChance}%` : "");

            if(text.length > 3) throw new Error("Too much text to display.");
            while(text.length < 3) text.push("");

            c.data1.text = text[0];
            c.data2.text = text[1];
            c.data3.text = text[2];

        }
    }

}
