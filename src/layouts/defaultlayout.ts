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
import St from "gi://St";
import * as Main from "resource:///org/gnome/shell/ui/main.js";
import { Config } from "../config.js";
import { detailName, Details, displayDetail } from "../details.js";
import { gettext as _g } from "../gettext.js";
import { displayDayOfWeek, displayTime } from "../lang.js";
import { theme } from "../theme.js";
import { Forecast, Weather } from "../weather.js";
import { CarouselBox } from "../carouselbox.js";
import { setPointer } from "../clutterutils.js";
import { createWeatherIcon } from "./icons.js";
import type { PopupLayout, PopupLayoutArgs } from "./layout.js";
import { getDayOfWeekDate } from "../utils.js";

interface ForecastCard {
    card : St.BoxLayout;
    day : St.Label;
    icon : St.Icon;
    data1 : St.Label;
    data2 : St.Label;
    data3 : St.Label;
}

interface CurrentInfoItem {
    caption : St.Label;
    value : St.Label;
    box : St.BoxLayout;
}

interface CurrentInfo {
    columns : St.Widget;
    grid : Clutter.GridLayout;
    items : CurrentInfoItem[];
    spacers : [St.Widget, St.Widget];
}

const MAX_DETAILS_PER_ROW = 4;

enum ForecastMode {
    Week = 0,
    SevenHours = 1,
    SecondPartOfDay = 2,
    Max = 2
}

function addChildren(parent : Clutter.Actor, ...children : Clutter.Actor[]) {
    children.forEach(child => parent.add_child(child));
}

function createForecastCard() : ForecastCard {
    const card = new St.BoxLayout({ vertical: true, x_expand: true, y_expand: true });
    const day = new St.Label({ text: "", x_align: Clutter.ActorAlign.CENTER });
    const icon = new St.Icon({
        icon_name: "",
        style_class: "simpleweather-card-icon",
        x_align: Clutter.ActorAlign.CENTER
    });
    const data1 = new St.Label({ text: "", x_align: Clutter.ActorAlign.CENTER });
    const data2 = new St.Label({ text: "", x_align: Clutter.ActorAlign.CENTER });
    const data3 = new St.Label({ text: "", x_align: Clutter.ActorAlign.CENTER });
    addChildren(card, day, icon, data1, data2, data3);
    return { card, day, icon, data1, data2, data3 };
}

function getTextColor() : `rgba(${number}, ${number}, ${number}, ${number})` {
    const color = Main.panel.get_theme_node().get_foreground_color();
    return `rgba(${color.red}, ${color.green}, ${color.blue}, ${color.alpha / 255})`;
}

function createDetailItem(config : Config) : CurrentInfoItem {
    const caption = new St.Label({
        x_expand: true,
        y_align: Clutter.ActorAlign.CENTER,
        x_align: Clutter.ActorAlign.FILL,
        style_class: "simpleweather-current-item sw-default-detail-caption"
    });
    const value = new St.Label({
        x_expand: true,
        y_align: Clutter.ActorAlign.CENTER,
        x_align: Clutter.ActorAlign.FILL,
        style_class: "simpleweather-current-item sw-default-detail-value"
    });

    if(config.getHighContrast()) {
        if(config.getTheme() === "") caption.style = `color:${getTextColor()}`;
    } else {
        theme(caption, "faded");
        if(!config.getHighlightDetailValues()) theme(value, "faded");
    }
    if((config.getHighContrast() || config.getHighlightDetailValues())
        && config.getTheme() === "") {
        value.style = `color:${getTextColor()}`;
    }

    const box = new St.BoxLayout({
        x_expand: true,
        y_expand: true,
        x_align: Clutter.ActorAlign.FILL,
        y_align: Clutter.ActorAlign.FILL
    });
    addChildren(box, caption, value);
    return { caption, value, box };
}

function createCurrentInfo(config : Config, parent : Clutter.Actor) : CurrentInfo {
    const grid = new Clutter.GridLayout({
        column_homogeneous: true,
        row_homogeneous: true
    });
    const columns = new St.Widget({
        x_expand: true,
        y_expand: true,
        layout_manager: grid
    });

    const items = Array.from(
        { length: Object.values(Details).length },
        () => createDetailItem(config)
    );
    const spacers : [St.Widget, St.Widget] = [
        new St.Widget({ x_expand: true }),
        new St.Widget({ x_expand: true })
    ];
    parent.add_child(columns);
    return { columns, grid, items, spacers };
}

export class DefaultLayout implements PopupLayout {
    readonly actor : St.BoxLayout;

    readonly #args : PopupLayoutArgs;
    readonly #current : St.BoxLayout;
    readonly #condition : St.Icon;
    readonly #temp : St.Label;
    readonly #forecastCards : ForecastCard[];
    readonly #currentInfo : CurrentInfo;
    readonly #carousel : CarouselBox;
    #forecastMode = ForecastMode.Week;
    #cachedWeather? : Weather;

    constructor(args : PopupLayoutArgs) {
        this.#args = args;
        this.actor = new St.BoxLayout({ vertical: false });

        this.#condition = new St.Icon({
            icon_name: "weather-clear-symbolic",
            style_class: "simpleweather-popup-icon",
            x_align: Clutter.ActorAlign.CENTER
        });
        this.#temp = new St.Label({
            text: "",
            style_class: "simpleweather-popup-temp",
            x_align: Clutter.ActorAlign.CENTER
        });

        this.#current = new St.BoxLayout({
            vertical: true,
            style_class: "simpleweather-current"
        });
        if(!args.config.getTheme()) this.#current.add_style_class_name("modal-dialog");
        theme(this.#current, "left-box");
        addChildren(this.#current, this.#condition, this.#temp);
        this.actor.add_child(this.#current);

        const right = new St.BoxLayout({ vertical: true });
        const forecasts = new St.BoxLayout({
            x_expand: true,
            y_expand: true,
            style_class: "simpleweather-card-row"
        });
        this.#forecastCards = Array.from({ length: 7 }, () => createForecastCard());
        addChildren(forecasts, ...this.#forecastCards.map(card => card.card));

        let mappedCards = 0;
        for(const { card } of this.#forecastCards) {
            const signalId = card.connect("notify::mapped", () => {
                if(!card.mapped) return;

                card.disconnect(signalId);
                mappedCards++;
                if(mappedCards !== this.#forecastCards.length) return;

                const maxWidth = this.#getMaxCellWidth();
                for(const forecastCard of this.#forecastCards) {
                    forecastCard.card.set_width(maxWidth);
                }
            });
        }

        this.#carousel = new CarouselBox(forecasts, ForecastMode.Max + 1, {
            track_hover: true,
            style_class: "button"
        });
        this.#carousel.setPage(this.#forecastMode);
        theme(this.#carousel, "forecast-box button");
        setPointer(this.#carousel);
        right.add_child(this.#carousel);
        this.#currentInfo = createCurrentInfo(args.config, right);
        this.#arrangeCurrentInfo(args.config.getDetailsList().length);
        this.actor.add_child(right);

        this.#carousel.onPageChanged(() => {
            this.#forecastMode = this.#carousel.page;
            if(this.#cachedWeather) this.#updateForecast(this.#cachedWeather);
        });
    }

    updateGui(weather : Weather) {
        this.#condition.gicon = createWeatherIcon(this.#args.metadata, weather.gIconName);
        this.#temp.text = weather.temp.display(this.#args.config);
        this.#updateForecast(weather);
    }

    destroy() {
        this.actor.destroy();
    }

    #getMaxCellWidth() {
        // Minimum of 50
        let maxWidth = 50;
        const measureLabel = this.#forecastCards[0].day;
        const originalText = measureLabel.text;

        // Times probably wouldn't ever be longer than the days of week text
        // but might as well check
        for(let i = -1; i < 7 + 24; i++) {
            let text;
            if(i === -1) {
                text = _g("Today");
            } else if(i < 7) {
                text = displayDayOfWeek(getDayOfWeekDate(i), false);
            } else {
                text = displayTime(new Date(2026, 0, 4, i - 7), this.#args.config, true);
            }
            measureLabel.set_text(text);
            const [, width] = measureLabel.get_preferred_width(-1);
            maxWidth = Math.max(maxWidth, width);
        }
        measureLabel.set_text(originalText);
        return maxWidth;
    }

    #getForecastLabels(weather : Weather) : string[] {
        const count = this.#forecastCards.length;
        const everyOtherHour = weather.hourForecast.filter((_, index) => index % 2 === 0);
        const forecasts : Forecast[] = [
            ...weather.forecast,
            ...everyOtherHour.slice(0, count * 2)
        ];
        const labels : string[] = [];

        for(let index = 0; index < count * 3; index++) {
            let text;
            if(index < count) {
                text = displayDayOfWeek(forecasts[index].date, true);
            } else {
                text = displayTime(forecasts[index].date, this.#args.config, true);
            }
            labels.push(text);
        }
        return labels;
    }

    #updateForecast(weather : Weather) {
        this.#cachedWeather = weather;
        const count = this.#forecastCards.length;
        const labels = this.#getForecastLabels(weather);
        const everyOtherHour = weather.hourForecast.filter((_, index) => index % 2 === 0);
        const forecasts : Forecast[] = [
            ...weather.forecast,
            ...everyOtherHour.slice(0, count * 2)
        ];
        const visible = forecasts.slice(this.#forecastMode * count, (this.#forecastMode + 1) * count);

        for(let index = 0; index < count; index++) {
            const card = this.#forecastCards[index];
            const forecast = visible[index];
            card.day.text = labels[index + this.#forecastMode * count];
            card.icon.gicon = createWeatherIcon(this.#args.metadata, forecast.gIconName);

            const text : string[] = [];
            if(forecast.temp !== undefined) {
                text.push(forecast.temp.display(this.#args.config));
            } else if(forecast.tempMax !== undefined && forecast.tempMin !== undefined) {
                text.push(_g("H: %s").format(forecast.tempMax.display(this.#args.config)));
                text.push(_g("L: %s").format(forecast.tempMin.display(this.#args.config)));
            }
            const rainChance = forecast.precipChancePercent;
            text.push(rainChance >= 30 ? `${Math.round(rainChance / 5) * 5}%` : "");
            while(text.length < 3) text.push("");
            [card.data1.text, card.data2.text, card.data3.text] = text;
        }

        const details = this.#args.config.getDetailsList();
        this.#arrangeCurrentInfo(details.length);
        for(let index = 0; index < details.length; index++) {
            const detail = details[index] as Details;
            const item = this.#currentInfo.items[index];
            if(!Object.values(Details).includes(detail)) {
                item.caption.text = `${_g("Invalid")}:`;
                item.value.text = "";
                continue;
            }
            item.caption.text = `${_g(detailName[detail] as string)}:`;
            item.value.text = displayDetail(weather, detail, _g, this.#args.config, true);
        }
    }

    #arrangeCurrentInfo(count : number) {
        const { columns, grid, items, spacers } = this.#currentInfo;

        this.#current.remove_style_class_name("sw-default-current-one-detail-row");
        this.#current.remove_style_class_name("sw-default-current-no-details");
        if(count > 0 && count <= 4) {
            this.#current.add_style_class_name("sw-default-current-one-detail-row");
        } else if(count === 0) {
            this.#current.add_style_class_name("sw-default-current-no-details");
        }

        for(const actor of [...items.map(item => item.box), ...spacers]) {
            const parent = actor.get_parent();
            if(parent) parent.remove_child(actor);
        }
        const itemsInLastRow = count % MAX_DETAILS_PER_ROW;
        const fullRowItemCount = count - itemsInLastRow;
        for(let index = 0; index < fullRowItemCount; index++) {
            const column = index % MAX_DETAILS_PER_ROW * 2;
            const row = Math.floor(index / MAX_DETAILS_PER_ROW);
            grid.attach(items[index].box, column, row, 2, 1);
        }

        if(itemsInLastRow > 0) {
            const row = Math.floor(count / MAX_DETAILS_PER_ROW);
            const spacerWidth = MAX_DETAILS_PER_ROW - itemsInLastRow;
            grid.attach(spacers[0], 0, row, spacerWidth, 1);

            for(let index = 0; index < itemsInLastRow; index++) {
                grid.attach(items[count - itemsInLastRow + index].box,
                    spacerWidth + index * 2, row, 2, 1);
            }
            grid.attach(spacers[1], spacerWidth + itemsInLastRow * 2,
                row, spacerWidth, 1);
        }
        columns.visible = count > 0;
    }
}
