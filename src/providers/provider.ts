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

import { Config } from "../config.js";
import { LibSoup } from "../libsoup.js";
import { Weather } from "../weather.js";
import { OpenMeteo } from "./openmeteo.js";
import { OpenWeatherMap } from "./openweathermap.js";

export interface Provider {

    readonly nameKey: string;

    fetchWeather(): Promise<Weather>;

}

export function createProvider(soup : LibSoup, config : Config) {
    const id = config.getWeatherProvider();
    switch(id) {
        case 1:
            return new OpenMeteo(soup, config);
        case 2:
            return new OpenWeatherMap(soup, config);
        default:
            throw new Error("Invalid weather provider ID.");
    }
}

export const WeatherProviderKeys : readonly string[] = Object.freeze([
    "Open-Meteo", "OpenWeatherMap"
]);

export function provRequiresKey(index : number) : boolean {
    const v : Record<string, boolean> = {
        0: false,
        1: true
    };
    const ret = v[index];
    if(typeof ret !== "boolean") throw new Error("Invalid argument.");
    return ret;
}

