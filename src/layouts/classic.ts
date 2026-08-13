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
import St from "gi://St";
import * as Main from "resource:///org/gnome/shell/ui/main.js";
import { Details, displayDetail } from "../details.js";
import { gettext as _g } from "../gettext.js";
import { displayTime } from "../lang.js";
import type { Forecast, Weather } from "../weather.js";
import { createWeatherIcon } from "./icons.js";
import type { PopupLayout, PopupLayoutArgs } from "./layout.js";

interface ForecastView {
    time : St.Label;
    icon : St.Icon;
    temperature : St.Label;
    summary : St.Label;
}

function addChildren(parent : Clutter.Actor, ...children : Clutter.Actor[]) {
    children.forEach(child => parent.add_child(child));
}

function usePrimaryTextColor(config : PopupLayoutArgs["config"], label : St.Label) {
    if(config.getTheme() !== "") return;

    const color = Main.panel.get_theme_node().get_foreground_color();
    label.style = `color: rgba(${color.red}, ${color.green}, ${color.blue}, ${color.alpha / 255})`;
}

function createForecastView(config : PopupLayoutArgs["config"]) {
    const actor = new St.BoxLayout({
        vertical: true,
        x_expand: true,
        x_align: Clutter.ActorAlign.CENTER,
        style_class: "sw-classic-hourly-item"
    });
    const time = new St.Label({
        x_align: Clutter.ActorAlign.CENTER,
        style_class: "sw-classic-forecast-time"
    });
    const iconBox = new St.BoxLayout({
        x_expand: true,
        x_align: Clutter.ActorAlign.CENTER,
        style_class: "sw-classic-forecast-icon-box"
    });
    const icon = new St.Icon({
        icon_name: "view-refresh-symbolic",
        x_align: Clutter.ActorAlign.CENTER,
        style_class: "sw-classic-forecast-icon"
    });
    const temperature = new St.Label({
        y_align: Clutter.ActorAlign.CENTER,
        style_class: "sw-classic-forecast-temperature"
    });
    usePrimaryTextColor(config, temperature);
    const summary = new St.Label({
        x_align: Clutter.ActorAlign.CENTER,
        style_class: "sw-classic-forecast-summary"
    });
    summary.clutter_text.line_wrap = true;
    addChildren(iconBox, icon, temperature);
    addChildren(actor, time, iconBox, summary);
    return { actor, view: { time, icon, temperature, summary } };
}

/**
 * OpenWeather Refined's current-conditions and today's-forecast presentation.
 * SimpleWeather owns the separate footer, so location switching and actions do
 * not need to be duplicated here.
 */
export class ClassicLayout implements PopupLayout {
    readonly actor : St.BoxLayout;

    readonly #args : PopupLayoutArgs;
    readonly #currentIcon : St.Icon;
    readonly #location : St.Label;
    readonly #summary : St.Label;
    readonly #sunrise : St.Label;
    readonly #sunset : St.Label;
    readonly #updated : St.Label;
    readonly #detailValues : St.Label[];
    readonly #hourly : ForecastView[];

    constructor(args : PopupLayoutArgs) {
        this.#args = args;
        this.actor = new St.BoxLayout({
            vertical: true,
            x_expand: true,
            style_class: "sw-classic-layout"
        });

        const currentRow = new St.BoxLayout({
            x_expand: true,
            style_class: "sw-classic-current-row"
        });
        this.#currentIcon = new St.Icon({
            icon_name: "weather-clear-symbolic",
            style_class: "sw-classic-current-icon"
        });
        currentRow.add_child(this.#currentIcon);

        const summaryBox = new St.BoxLayout({
            vertical: true,
            x_expand: true,
            y_expand: true,
            y_align: Clutter.ActorAlign.CENTER,
            style_class: "sw-classic-summary-box"
        });
        this.#location = new St.Label({ style_class: "sw-classic-location" });
        this.#summary = new St.Label({ style_class: "sw-classic-summary" });
        usePrimaryTextColor(args.config, this.#summary);

        const sunInfo = new St.BoxLayout({ style_class: "sw-classic-sun-info" });
        const sunriseIcon = new St.Icon({
            icon_name: "daytime-sunrise-symbolic",
            style_class: "sw-classic-sun-icon sw-classic-first-sun-icon"
        });
        this.#sunrise = new St.Label();
        const sunsetIcon = new St.Icon({
            icon_name: "daytime-sunset-symbolic",
            style_class: "sw-classic-sun-icon"
        });
        this.#sunset = new St.Label();
        const updatedIcon = new St.Icon({
            icon_name: "view-refresh-symbolic",
            style_class: "sw-classic-update-icon"
        });
        this.#updated = new St.Label();
        addChildren(
            sunInfo,
            sunriseIcon,
            this.#sunrise,
            sunsetIcon,
            this.#sunset,
            updatedIcon,
            this.#updated
        );
        addChildren(summaryBox, this.#location, this.#summary, sunInfo);
        currentRow.add_child(summaryBox);

        const detailBox = new St.BoxLayout({
            x_expand: false,
            y_align: Clutter.ActorAlign.CENTER,
            style_class: "sw-classic-detail-box"
        });
        const captions = new St.BoxLayout({
            vertical: true,
            style_class: "sw-classic-detail-captions"
        });
        const values = new St.BoxLayout({
            vertical: true,
            style_class: "sw-classic-detail-values"
        });
        const detailNames = [
            _g("Feels Like"),
            _g("Humidity"),
            _g("Pressure"),
            _g("Wind"),
            _g("Gusts")
        ];
        this.#detailValues = detailNames.map(name => {
            captions.add_child(new St.Label({ text: `${name}:` }));
            const value = new St.Label({ text: "\u2026" });
            usePrimaryTextColor(args.config, value);
            values.add_child(value);
            return value;
        });
        addChildren(detailBox, captions, values);
        currentRow.add_child(detailBox);
        this.actor.add_child(currentRow);

        const hourlyRow = new St.BoxLayout({
            x_expand: true,
            style_class: "sw-classic-hourly-row"
        });
        this.#hourly = [];
        for(let index = 0; index < 4; index++) {
            const forecast = createForecastView(args.config);
            hourlyRow.add_child(forecast.actor);
            this.#hourly.push(forecast.view);
        }
        this.actor.add_child(hourlyRow);
    }

    updateGui(weather : Weather) {
        const { config, metadata } = this.#args;
        this.#currentIcon.gicon = createWeatherIcon(metadata, weather.gIconName);
        this.#location.text = weather.loc.getName();
        this.#summary.text = `${weather.conditionText.display(config)}, ${weather.temp.display(config)}`;
        this.#sunrise.text = displayTime(weather.sunrise, config);
        this.#sunset.text = displayTime(weather.sunset, config);
        this.#updated.text = displayTime(weather.observedAt, config);

        const details = [
            Details.FEELS_LIKE,
            Details.HUMIDITY,
            Details.PRESSURE,
            Details.WIND_SPEED_AND_DIR,
            Details.GUSTS
        ];
        details.forEach((detail, index) => {
            this.#detailValues[index].text = displayDetail(weather, detail, _g, config, true);
        });

        const hourly = weather.hourForecast
            .filter((_, index) => index % 3 === 0)
            .slice(0, this.#hourly.length);
        this.#updateForecastViews(this.#hourly, hourly, forecast =>
            displayTime(forecast.date, config, true));
    }

    destroy() {
        this.actor.destroy();
    }

    #updateForecastViews(
        views : ForecastView[],
        forecasts : Forecast[],
        timeText : (forecast : Forecast) => string
    ) {
        views.forEach((view, index) => {
            const forecast = forecasts[index];
            if(!forecast) {
                view.time.text = "";
                view.icon.icon_name = "";
                view.temperature.text = "";
                view.summary.text = "";
                return;
            }

            view.time.text = timeText(forecast);
            view.icon.gicon = createWeatherIcon(this.#args.metadata, forecast.gIconName);
            if(forecast.temp !== undefined) {
                view.temperature.text = forecast.temp.display(this.#args.config);
            } else if(forecast.tempMax !== undefined && forecast.tempMin !== undefined) {
                view.temperature.text = `${forecast.tempMax.display(this.#args.config)} / ${forecast.tempMin.display(this.#args.config)}`;
            } else {
                view.temperature.text = "";
            }
            view.summary.text = forecast.conditionText?.display(this.#args.config) ?? "";
        });
    }
}
