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

import { LibSoup } from "../libsoup.js";
import { Temp } from "../units.js";
import { Weather } from "../weather.js";
import { Provider } from "./provider.js";

const ENDPOINT = "https://api.weatherapi.com/v1/forecast.json";

export class OpenMeteo implements Provider {

    readonly #soup : LibSoup;

    readonly nameKey = "Open-Meteo";

    constructor(soup : LibSoup) {
        this.#soup = soup;
    }

    async #fetch() : Promise<any> {

        const params = {
            latitude: 0,
            longitude: 0,
            current: "temperature",
            temperature_unit: "fahrenheit"
        };
        // params.lang

        const response = await this.#soup.fetchJson(ENDPOINT, params, false);
        return response.body;
    }

    async fetchWeather() : Promise<Weather> {
        const body = await this.#fetch();
        const temp = new Temp(body.current?.temperature_2m ?? NaN);

        return {
            temp
        };
    }

}
