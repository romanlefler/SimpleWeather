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

export enum Details {
    TEMP = "temp",
    FEELS_LIKE = "feelsLike",
    WIND_SPEED_AND_DIR = "windSpeedAndDir",
    HUMIDITY = "humidity",
    GUSTS = "gusts",
    UV_INDEX = "uvIndex",
    PRESSURE = "pressure",
    PRECIPITATION = "precipitation",
    SUNRISE = "sunrise",
    SUNSET = "sunset"
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
export const detailFormat : IDetails = {
    temp: _g("Temp: %s"),
    feelsLike: _g("Feels Like: %s"),
    windSpeedAndDir: _g("Wind: %s"),
    humidity: _g("Humidity: %s"),
    gusts: _g("Gusts: %s"),
    uvIndex: _g("UV High: %s"),
    pressure: _g("Pressure: %s"),
    precipitation: _g("Precipitation: %s"),
    sunrise: _g("Sunrise: %s"),
    sunset: _g("Sunset: %s"),
}
