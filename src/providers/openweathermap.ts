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

import { Config } from "../config.js";
import { LibSoup } from "../libsoup.js";
import { Direction, Percentage, Pressure, RainMeasurement, Speed, SpeedAndDir, Temp, Countdown } from "../units.js";
import { Condition, Forecast, Weather, gettextCondit } from "../weather.js";
import { getGIconName, Icons } from "../icons.js"
import { Provider } from "./provider.js";
import { Location } from "../location.js";

const ENDPOINT = "https://api.openweathermap.org/data/3.0/onecall";

export class OpenWeatherMap implements Provider {

    readonly #soup : LibSoup;
    readonly #config : Config;

    readonly nameKey = "OpenWeatherMap";

    constructor(soup : LibSoup, config : Config) {
        this.#soup = soup;
        this.#config = config;
    }

    async #fetch(loc : Location) : Promise<any> {

        const coords = await loc.latLon();

        const key = this.#config.getApiKeys().get(this.nameKey) ?? "";
        const params : Record<string, string> = {
            lat: String(coords.lat),
            lon: String(coords.lon),
            units: "imperial",
            exclude: "minutely,alerts",
            appid: key
        };
        console.log(`Fetching with key ${key}`);

        const response = await this.#soup.fetchJson(ENDPOINT, params, false);
        if(!response.is2xx) {
            throw new Error(
                `OpenWeatherMap gave status code ${response.status}. ` +
                `Reason: ${response.body?.message ?? response.body?.reason ?? "None Given"}`
            );
        }

        return response.body;
    }

    async fetchWeather() : Promise<Weather> {
        const loc = this.#config.getMainLocation();
        const body = await this.#fetch(loc);
        const cur = body.current!;
        const daily = body.daily!;
        const hourly = body.hourly!;

        const weather = cur.weather[0]!;
        const temp = new Temp(cur.temp);
        const feelsLike = new Temp(cur.feels_like);
        const wind = new Speed(cur.wind_speed);
        const gusts = new Speed(cur.wind_gust ?? 0);
        const windDir = new Direction(cur.wind_deg);
        const humidity = new Percentage(cur.humidity);
        // hPa to inHg
        const pressure = new Pressure(cur.pressure * 0.02953);
        const uvIndex = cur.uvi;
        const isNight = weather.icon.endsWith("n");
        const precipitation = new RainMeasurement(mmToIn(
            (cur.rain?.["1h"] ?? 0) + (cur.snow?.["1h"] ?? 0)
        ));
        const cloudCover = new Percentage(cur.clouds);

        const { c: condit, i: icon } = codeToIcon[weather.id] ?? codeToIcon[800];
        const gIconName = getGIconName(icon, isNight);

        // If sunrise/sunset have already happened, take the next day's
        const now = new Date();
        let sunrise = unixToDate(cur.sunrise, now);
        if(now > sunrise && daily[1]?.sunrise !== undefined) {
            sunrise = unixToDate(daily[1].sunrise, sunrise);
        }
        let sunset = unixToDate(cur.sunset, now);
        if(now > sunset && daily[1]?.sunset !== undefined) {
            sunset = unixToDate(daily[1].sunset, sunset);
        }

        const dayForecast : Forecast[] = [ ];
        const dayCount = daily.length;
        for(let i = 0; i < dayCount; i++) {
            const fWeather = daily[i].weather[0]!;
            // We always want day icons for day forecast
            const fIcon = codeToIcon[fWeather.id] ?? codeToIcon[800];
            const fIconName = getGIconName(fIcon.i, false);
            dayForecast.push({
                date: unixToDate(daily[i].dt),
                gIconName: fIconName,
                tempMin: new Temp(daily[i].temp.min),
                tempMax: new Temp(daily[i].temp.max),
                precipChancePercent: Math.round(daily[i].pop * 100)
            });
        }

        const hourForecast : Forecast[] = [ ];
        const hourCount = Math.min(hourly.length, 28);
        for(let i = 0; i < hourCount; i++) {
            const fWeather = hourly[i].weather[0]!;
            const fIsNight = fWeather.icon.endsWith("n");
            const fIcon = codeToIcon[fWeather.id] ?? codeToIcon[800];
            const fIconName = getGIconName(fIcon.i, fIsNight);
            hourForecast.push({
                date: unixToDate(hourly[i].dt),
                gIconName: fIconName,
                temp: new Temp(hourly[i].temp),
                precipChancePercent: Math.round(hourly[i].pop * 100)
            });
        }

        return {
            condit,
            temp,
            gIconName,
            isNight,
            sunrise,
            sunset,
            forecast: dayForecast,
            hourForecast,
            feelsLike,
            wind,
            gusts,
            windDir,
            humidity,
            pressure,
            uvIndex,
            precipitation,
            cloudCover,
            conditionText: gettextCondit(condit, isNight),
            windSpeedAndDir: new SpeedAndDir(wind, windDir),
            providerName: this.nameKey,
            loc,
            sunEventCountdown: new Countdown(sunrise < sunset ? sunrise : sunset)
        };
    }

}

function mmToIn(mm : number) : number {
    return mm * 0.0393701;
}

function unixToDate(ts : number | undefined, fallback : Date = new Date()) : Date {
    if(ts === undefined) return new Date(fallback.getTime());
    return new Date(ts * 1000);
}

// https://openweathermap.org/weather-conditions
const codeToIcon : Record<number, { c : Condition, i : string }> = {
    200: { c : Condition.STORMY, i: Icons.Stormy },
    201: { c : Condition.STORMY, i: Icons.Stormy },
    202: { c : Condition.STORMY, i: Icons.Stormy },
    210: { c : Condition.STORMY, i: Icons.Stormy },
    211: { c : Condition.STORMY, i: Icons.Stormy },
    212: { c : Condition.STORMY, i: Icons.Stormy },
    221: { c : Condition.STORMY, i: Icons.Stormy },
    230: { c : Condition.STORMY, i: Icons.Stormy },
    231: { c : Condition.STORMY, i: Icons.Stormy },
    232: { c : Condition.STORMY, i: Icons.Stormy },

    300: { c : Condition.RAINY, i: Icons.RainScattered },
    301: { c : Condition.RAINY, i: Icons.RainScattered },
    302: { c : Condition.RAINY, i: Icons.RainScattered },
    310: { c : Condition.RAINY, i: Icons.RainScattered },
    311: { c : Condition.RAINY, i: Icons.RainScattered },
    312: { c : Condition.RAINY, i: Icons.RainScattered },
    313: { c : Condition.RAINY, i: Icons.RainScattered },
    314: { c : Condition.RAINY, i: Icons.RainScattered },
    321: { c : Condition.RAINY, i: Icons.RainScattered },

    500: { c : Condition.RAINY, i: Icons.RainScattered },
    501: { c : Condition.RAINY, i: Icons.Rainy },
    502: { c : Condition.RAINY, i: Icons.Rainy },
    503: { c : Condition.RAINY, i: Icons.Rainy },
    504: { c : Condition.RAINY, i: Icons.Rainy },
    511: { c : Condition.RAINY, i: Icons.FreezingRain },
    520: { c : Condition.RAINY, i: Icons.RainScattered },
    521: { c : Condition.RAINY, i: Icons.Rainy },
    522: { c : Condition.RAINY, i: Icons.Rainy },
    531: { c : Condition.RAINY, i: Icons.Rainy },

    600: { c : Condition.SNOWY, i: Icons.Snowy },
    601: { c : Condition.SNOWY, i: Icons.Snowy },
    602: { c : Condition.SNOWY, i: Icons.Snowy },
    611: { c : Condition.SNOWY, i: Icons.Snowy },
    612: { c : Condition.SNOWY, i: Icons.Snowy },
    613: { c : Condition.SNOWY, i: Icons.Snowy },
    615: { c : Condition.SNOWY, i: Icons.Snowy },
    616: { c : Condition.SNOWY, i: Icons.Snowy },
    620: { c : Condition.SNOWY, i: Icons.Snowy },
    621: { c : Condition.SNOWY, i: Icons.Snowy },
    622: { c : Condition.SNOWY, i: Icons.Snowy },

    701: { c : Condition.CLOUDY, i: Icons.Foggy },
    711: { c : Condition.CLOUDY, i: Icons.Foggy },
    721: { c : Condition.CLOUDY, i: Icons.Foggy },
    731: { c : Condition.CLOUDY, i: Icons.Foggy },
    741: { c : Condition.CLOUDY, i: Icons.Foggy },
    751: { c : Condition.CLOUDY, i: Icons.Foggy },
    761: { c : Condition.CLOUDY, i: Icons.Foggy },
    762: { c : Condition.CLOUDY, i: Icons.Foggy },
    771: { c : Condition.STORMY, i: Icons.Stormy },
    781: { c : Condition.STORMY, i: Icons.Stormy },

    800: { c : Condition.CLEAR, i: Icons.Clear },

    801: { c : Condition.CLEAR, i: Icons.Clear },
    802: { c : Condition.CLOUDY, i: Icons.Cloudy },
    803: { c : Condition.CLOUDY, i: Icons.Overcast },
    804: { c : Condition.CLOUDY, i: Icons.Overcast }
};
