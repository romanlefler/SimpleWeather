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

import { Config } from "./config.js";
import { displayTime } from "./lang.js";
import { Displayable } from "./units.js";
import { Weather } from "./weather.js";

export enum Details {
    TEMP = "temp",
    CONDITION_TEXT = "conditionText",
    FEELS_LIKE = "feelsLike",
    WIND_SPEED_AND_DIR = "windSpeedAndDir",
    HUMIDITY = "humidity",
    GUSTS = "gusts",
    UV_INDEX = "uvIndex",
    PRESSURE = "pressure",
    PRECIPITATION = "precipitation",
    SUNRISE = "sunrise",
    SUNSET = "sunset",
    CLOUD_COVER = "cloudCover"
}

/**
 * This interface includes a property named for every *value*
 * in the Details enum.
 */
export type IDetails = {
    [K in `${Details}`] : unknown;
};

// Fake gettext to trick xgettext into
// translating these strings
function _g(s : string) : string {
    return s;
}

/**
 * Gets a string that should be passed into gettext.
 * THE CALLER MUST TRANSLATE THE VALUE.
 * THESE ARE NOT PASSED INTO GETTEXT.
 */
export const detailName : IDetails = {
    temp: _g("Temperature"),
    conditionText: _g("Condition"),
    feelsLike: _g("Feels Like"),
    windSpeedAndDir: _g("Wind"),
    humidity: _g("Humidity"),
    gusts: _g("Gusts"),
    uvIndex: _g("UV High"),
    pressure: _g("Pressure"),
    precipitation: _g("Precipitation"),
    sunrise: _g("Sunrise"),
    sunset: _g("Sunset"),
    cloudCover: _g("Cloud Cover"),
};

export function displayDetail(w : Weather, detail : Details, gettext : (s : string) => string,
    cfg : Config, onlyValue = false) {
    if(detail as string === "invalid") return _g("Invalid");

    const value = w[detail];
    let fmt: string;
    if (typeof (value as any).display === "function") {
        fmt = (value as Displayable).display(cfg);
    } else if(value instanceof Date) {
        fmt = displayTime(value, cfg);
    } else if (typeof value === "number") {
        fmt = `${Math.round(value)}`;
    } else throw new Error("Detail must implement Displayable or be a Date or number.");

    if(onlyValue) return fmt;
    const name = detailName[detail] as string;
    return `${_g(name)}: ${fmt}`;
}
