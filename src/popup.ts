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
import St from "gi://St";
import Meta from "gi://Meta";
import { ExtensionMetadata, gettext as _ } from "resource:///org/gnome/shell/extensions/extension.js";
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PopupMenu from "resource:///org/gnome/shell/ui/popupMenu.js";
import { Config } from "./config.js";
import { Forecast, Weather } from "./weather.js";
import { displayDayOfWeek, displayTime } from "./lang.js";
import { gettext as _g } from "./gettext.js";
import { Details, displayDetail } from "./details.js";
import { theme, themeInitAll } from "./theme.js";

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
        text: _g("Today"),
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

function addChildren(parent : Clutter.Actor, ...children : Clutter.Actor[]) {
    children.forEach(m => parent.add_child(m));
}

function getTextColor() : `rgba(${number}, ${number}, ${number}, ${number})` {
    const color = Main.panel.get_theme_node().get_foreground_color();
    return `rgba(${color.red}, ${color.green}, ${color.blue}, ${color.alpha / 255})`;
}

function evenLabel(opts : Partial<St.Label.ConstructorProps> = {}) {
    const label = new St.Label({
        x_expand: true,
        y_align: Clutter.ActorAlign.CENTER,
        x_align: Clutter.ActorAlign.FILL,
        style_class: "simpleweather-current-item",
        ...opts
    });
    theme(label, "faded");
    const box = new St.BoxLayout({
        x_expand: true,
        x_align: Clutter.ActorAlign.FILL,
    });
    box.add_child(label);
    return { label, box };
}

function createCurInfo(parent : Clutter.Actor) : St.Label[] {
    const cols = new St.BoxLayout({ vertical: true, x_expand: true });
    const row1 = new St.BoxLayout({ vertical: false, x_expand: true, y_expand: true, x_align: Clutter.ActorAlign.FILL });
    const row2 = new St.BoxLayout({ vertical: false, x_expand: true, y_expand: true, x_align: Clutter.ActorAlign.FILL });
    addChildren(cols, row1, row2);

    const list = Array.from({ length: 8 }, evenLabel);
    const boxes = list.map(l => l.box);
    addChildren(row1, ...boxes.slice(0, 4));
    addChildren(row2, ...boxes.slice(4, 8));

    parent.add_child(cols);
    return list.map(l => l.label);
}

function copyrightText(provName : string) : string {
    return `${_g("Weather Data")} \u00A9 ${provName} ${new Date().getFullYear()}`;
}

// Widget must have reactive and track_hover true
function setPointer(widget : Clutter.Actor) : void {
    widget.connect("enter-event", () => {
        global.display.set_cursor(Meta.Cursor.POINTER);
    });
    widget.connect("leave-event", () => {
        global.display.set_cursor(Meta.Cursor.DEFAULT);
    });
}

export class Popup {

    readonly #config : Config;
    readonly #metadata : ExtensionMetadata;

    readonly #condition : St.Icon;
    readonly #temp : St.Label;
    readonly #forecastCards : ForecastCard[];
    readonly #copyright : St.Label;
    readonly #currentLabels : St.Label[];
    readonly #placeLabel : St.Label;
    readonly #placeBtn : St.Button;

    readonly #menuItems : PopupMenu.PopupBaseMenuItem[];

    #foreMode : ForecastMode;
    #cachedWeather? : Weather;
    #wasHiContrast : boolean = false;

    constructor(
        config : Config,
        metadata : ExtensionMetadata,
        openPreferences : () => void,
        menu : PopupMenu.PopupMenu,
        settings : Gio.Settings
    ) {

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
            style_class: "simpleweather-current"
        });
        if(!this.#config.getTheme()) leftVBox.add_style_class_name("modal-dialog");
        theme(leftVBox, "left-box");
        leftVBox.add_child(this.#condition);
        leftVBox.add_child(this.#temp);

        hbox.add_child(leftVBox);

        const rightVBox = new St.BoxLayout({
            vertical: true
        });
        const forecasts = new St.BoxLayout({
            vertical: false,
            x_expand: true,
            y_expand: false,
            track_hover: true,
            reactive: true,
            style_class: "button simpleweather-card-row"
        });
        theme(forecasts, "forecast-box button");
        this.#forecastCards = [ ];
        for(let i = 0; i < 7; i++) {
            const c = createForecastCard();
            forecasts.add_child(c.card);
            this.#forecastCards.push(c);
        }
        rightVBox.add_child(forecasts);
        this.#currentLabels = createCurInfo(rightVBox);
        if(this.#currentLabels.length !== 8) throw new Error("Incorrect cur len.");
        hbox.add_child(rightVBox);

        forecasts.connect("button-press-event", () => {
            this.#foreMode++;
            if(this.#foreMode > ForecastMode.Max) this.#foreMode = 0;

            const w = this.#cachedWeather;
            if(w) this.#updateForecast(w);
        });

        const childItem = new PopupMenu.PopupBaseMenuItem({ reactive: false });
        theme(childItem, "bg");
        childItem.actor.add_child(hbox);

        const textRect = new St.BoxLayout({
            vertical: false,
        });
        this.#copyright = new St.Label({
            text: "",
            x_expand: false,
            x_align: Clutter.ActorAlign.START,
            y_align: Clutter.ActorAlign.CENTER,
        });
        textRect.add_child(this.#copyright);

        const baseText = new PopupMenu.PopupBaseMenuItem({ reactive: false });
        theme(baseText, "bg");
        baseText.actor.add_child(textRect);

        this.#placeLabel = new St.Label();
        this.#placeBtn = new St.Button({
            child: this.#placeLabel,
            style_class: "button",
            margin_left: 20,
            margin_right: 20,
            reactive: true,
            opacity: 255,
            x_expand: true
        });
        theme(this.#placeBtn, "button");
        this.#placeBtn.connect("clicked", () => {
            const placeCount = config.getLocations().length;
            if(placeCount === 1) return;
            // These will be restored in the #updateGUI method
            this.#placeBtn.reactive = false;
            this.#placeBtn.opacity = 127;

            const index = config.getMainLocationIndex();
            let newIndex;
            if(index === placeCount - 1) newIndex = 0;
            else newIndex = index + 1;
            settings.set_int64("main-location-index", newIndex);
        });
        baseText.actor.add_child(this.#placeBtn);

        const configBtn = new St.Button({
            child: new St.Icon({
                icon_name: "preferences-system-symbolic",
                style_class: "simpleweather-settings-icon"
            }),
            reactive: true,
            can_focus: true,
            track_hover: true,
            accessible_name: _g("Settings"),
            x_expand: false,
            x_align: Clutter.ActorAlign.END,
            y_align: Clutter.ActorAlign.CENTER,
            style_class: "message-list-clear-button button",
        });
        theme(configBtn, "button");
        configBtn.connect("clicked", () => {
            menu.toggle();
            openPreferences();
        });
        baseText.actor.add_child(configBtn);

        setPointer(forecasts);
        setPointer(this.#placeBtn);
        setPointer(configBtn);

        this.#menuItems = [ childItem, baseText ];
        menu.addMenuItem(childItem);
        menu.addMenuItem(baseText);
    }

    destroy(menu : PopupMenu.PopupMenu) {
        this.#menuItems.forEach(m => m.destroy());
    }

    #createIcon(s : string) : Gio.Icon {
        const iconPath = `${this.#metadata.path}/icons/${s}-symbolic.svg`;
        const iconFile = Gio.File.new_for_path(iconPath);
        return new Gio.FileIcon({ file: iconFile });
    }

    updateGui(w : Weather) {
        this.#condition.gicon = this.#createIcon(w.gIconName);
        this.#temp.text = w.temp.display(this.#config);
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
            if(this.#foreMode === ForecastMode.Week) dateText = displayDayOfWeek(fore[i].date, true);
            else dateText = displayTime(fore[i].date, this.#config, true);

            c.day.text = dateText;

            c.icon.gicon = this.#createIcon(fore[i].gIconName);

            const text : string[] = [ ];

            const temp = fore[i].temp;
            const tempMin = fore[i].tempMin;
            const tempMax = fore[i].tempMax;
            if(temp !== undefined) {
                text.push(temp.display(this.#config));
            }
            else if(tempMax !== undefined && tempMin !== undefined) {
                text.push(_g("H: %s").format(tempMax.display(this.#config)));
                text.push(_g("L: %s").format(tempMin.display(this.#config)));
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

        this.#placeLabel.text = w.loc.getName();

        const details = this.#config.getDetailsList();
        const detailPossibilities = Object.values(details);
        for(let i = 0; i < 8; i++) {
            const label = this.#currentLabels[i];
            if(!detailPossibilities.includes(details[i])) {
                label.text = _g("Invalid");
                continue;
            }
            const deet = details[i] as Details;
            label.text = displayDetail(w, deet, _g, this.#config);
        }

        // This only performs the updates if necessary
        if(this.#config.getHighContrast()) {
            if(!this.#wasHiContrast) {
                this.#wasHiContrast = true;
                const color = getTextColor();
                const affected = [ this.#copyright, ...Object.values(this.#currentLabels) ];
                for(const w of affected) {
                    if(w instanceof St.Widget) w.style = `color:${color};`;
                }
            }
        }
        else {
            if(this.#wasHiContrast) {
                this.#wasHiContrast = false;
                const affected = [ this.#copyright, ...Object.values(this.#currentLabels) ];
                for(const w of affected) {
                    if(w instanceof St.Widget) w.style = "";
                }
            }
        }

        this.#placeBtn.reactive = true;
        this.#placeBtn.opacity = 255;
    }

}
