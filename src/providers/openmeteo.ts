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
import { Temp } from "../units.js";
import { DayForecast, Weather } from "../weather.js";
import { getGIconName, Icons } from "../icons.js"
import { Provider } from "./provider.js";

const ENDPOINT = "https://api.open-meteo.com/v1/forecast";

export class OpenMeteo implements Provider {

    readonly #soup : LibSoup;
    readonly #config : Config;

    readonly nameKey = "Open-Meteo";

    constructor(soup : LibSoup, config : Config) {
        this.#soup = soup;
        this.#config = config;
    }

    async #fetch() : Promise<any> {

        const loc = this.#config.getMainLocation();
        const coords = await loc.latLon();

        const params = {
            latitude: String(coords.lat),
            longitude: String(coords.lon),
            current: "temperature_2m,weather_code,is_day",
            daily: "sunset,sunrise,weather_code,temperature_2m_min,temperature_2m_max," +
                "precipitation_probability_max",
            temperature_unit: "fahrenheit"
        };
        // params.lang

        const response = await this.#soup.fetchJson(ENDPOINT, params, false);
        if(!response.is2xx) {
            throw new Error(
                `Open-Meteo gave status code ${response.status}. ` +
                `Reason: ${response.body?.reason ?? "None Given"}`
            );
        }

        return response.body;
    }

    async fetchWeather() : Promise<Weather> {
        const body = await this.#fetch();
        const cur = body.current!;
        const daily = body.daily!;

        const temp = new Temp(cur.temperature_2m);
        const isNight = cur.is_day === 0;

        const icon = codeToIcon[cur.weather_code];
        const gIconName = getGIconName(icon, isNight);

        // Z means UTC
        const sunrise = new Date(body.daily.sunrise[0] + "Z");
        const sunset = new Date(body.daily.sunset[0] + "Z");

        const forecast : DayForecast[] = [ ];
        const dayCount = daily.time.length;
        for(let i = 0; i < dayCount; i++) {
            const fDateStr = daily.time[i];
            // We always want day icons for forecast
            const fIcon = codeToIcon[daily.weather_code[i]];
            const fIconName = getGIconName(fIcon, false);
            forecast.push({
                // This T00 thing tells the parser to assume local time (which we must do)
                date: new Date(`${fDateStr}T00:00:00`),
                gIconName: fIconName,
                tempMin: new Temp(daily.temperature_2m_min[i]),
                tempMax: new Temp(daily.temperature_2m_max[i]),
                precipChancePercent: daily.precipitation_probability_max[i]
            });
        }

        return {
            temp,
            gIconName,
            isNight,
            sunrise,
            sunset,
            forecast,
            providerName: this.nameKey
        };
    }

}

// https://open-meteo.com/en/docs#weather_variable_documentation
const codeToIcon : Record<number, string> = {
    0: Icons.Clear,

    1: Icons.Clear,
    2: Icons.Cloudy,
    3: Icons.Overcast,

    45: Icons.Foggy,
    48: Icons.Foggy,

    51: Icons.RainScattered,
    53: Icons.Rainy,
    55: Icons.Rainy,

    56: Icons.FreezingRain,
    57: Icons.FreezingRain,

    61: Icons.RainScattered,
    63: Icons.Rainy,
    65: Icons.Rainy,

    66: Icons.FreezingRain,
    67: Icons.FreezingRain,

    71: Icons.Snowy,
    73: Icons.Snowy,
    75: Icons.Snowy,

    77: Icons.Snowy,

    80: Icons.RainScattered,
    81: Icons.Rainy,
    82: Icons.Rainy,

    85: Icons.Snowy,
    86: Icons.Snowy,

    95: Icons.Stormy,

    96: Icons.Hail,
    99: Icons.Hail
};
