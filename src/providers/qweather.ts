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

interface QWeatherJson {
    current : any;
    daily : any;
    hourly : any;
}

export class QWeather implements Provider {

    readonly #soup : LibSoup;
    readonly #config : Config;

    readonly nameKey = "QWeather";

    constructor(soup : LibSoup, config : Config) {
        this.#soup = soup;
        this.#config = config;
    }

    /**
     * Gets the user-defined API host and API key,
     * throwing if either one is not set.
     */
    #getAuth() : { host : string, headers : Record<string, string> } {
        const key = this.#config.getApiKeys().get(this.nameKey) ?? "";
        if(key.length === 0) throw new Error("QWeather API key is not set.");

        let host = this.#config.getApiHosts().get(this.nameKey) ?? "";
        // Strip the scheme and trailing slashes in case the user included them
        host = host.replace(/^https?:\/\//, "").replace(/\/+$/, "");
        if(host.length === 0) throw new Error("QWeather API host is not set.");

        return {
            host,
            headers: { "X-QW-Api-Key": key }
        };
    }

    async #requestJson(path : string, params : Record<string, string>) : Promise<any> {
        const { host, headers } = this.#getAuth();

        const response = await this.#soup.fetchJson(
            `https://${host}${path}`, params, false, headers
        );
        if(!response.is2xx) {
            throw new Error(
                `QWeather gave status code ${response.status}. ` +
                `Reason: ${response.body?.reason ?? response.body?.code ?? "None Given"}`
            );
        }

        const body = response.body;
        // Some errors are returned with HTTP 200 and an error code in the body
        if(body?.code !== undefined && body.code !== "200") {
            throw new Error(
                `QWeather gave error code ${body.code}. ` +
                `Reason: ${body.reason ?? "None Given"}`
            );
        }

        return body;
    }

    async #requestWeatherJson(loc : Location) : Promise<QWeatherJson> {
        const coords = await loc.latLon();
        // The API supports at most two decimal places
        const lat = coords.lat.toFixed(2);
        const lon = coords.lon.toFixed(2);

        const [ current, daily, hourly ] = await Promise.all([
            this.#requestJson(`/weather/v1/current/${lat}/${lon}`, { localTime: "true" }),
            this.#requestJson(`/weather/v1/daily/${lat}/${lon}`, { days: "7", localTime: "true" }),
            this.#requestJson(`/weather/v1/hourly/${lat}/${lon}`, { hours: "28", localTime: "true" })
        ]);

        return { current, daily, hourly };
    }

    async fetchWeather() : Promise<Weather> {
        const loc = this.#config.getMainLocation();
        const body = await this.#requestWeatherJson(loc);
        return this.#parseWeatherJson(body, loc);
    }

    #parseWeatherJson(body : QWeatherJson, loc : Location) : Weather {
        const { current: cur, daily, hourly } = body;
        const days = daily.days!;
        const hours = hourly.hours!;

        const code = parseInt(cur.condition?.code ?? "") || 999;
        const { c: condit, i: icon } = codeToIcon[code] ?? defaultIcon;

        const temp = new Temp(cToF(cur.temperature.value));
        const feelsLike = new Temp(cToF(cur.feelsLike.value));
        const wind = new Speed(mpsToMph(cur.wind?.speed?.value ?? 0));
        const gusts = new Speed(mpsToMph(cur.windGust?.value ?? 0));
        const windDir = new Direction(cur.wind?.direction?.degree ?? 0);
        const humidity = new Percentage((cur.humidity ?? 0) * 100);
        // hPa to inHg
        const pressure = new Pressure((cur.pressure?.value ?? 0) * 0.02953);
        const uvIndex = cur.uvIndex ?? 0;
        const precipitation = new RainMeasurement(mmToIn(cur.precipitation?.amount?.value ?? 0));
        const cloudCover = new Percentage((cur.cloudCover ?? 0) * 100);

        const observedAt = isoToDate(cur.forecastTime ?? cur.obsTime);

        // Sunrise/sunset of the current day
        const todaySunrise = isoToDate(days[0]?.astro?.sunrise);
        const todaySunset = isoToDate(days[0]?.astro?.sunset);
        const isNight = observedAt < todaySunrise || observedAt > todaySunset;
        const gIconName = getGIconName(icon, isNight);

        // If sunrise/sunset have already happened, take the next day's
        const now = new Date();
        let sunrise = todaySunrise;
        if(now > sunrise && days[1]?.astro?.sunrise !== undefined) {
            sunrise = isoToDate(days[1].astro.sunrise);
        }
        let sunset = todaySunset;
        if(now > sunset && days[1]?.astro?.sunset !== undefined) {
            sunset = isoToDate(days[1].astro.sunset);
        }

        const dayForecast : Forecast[] = [ ];
        const dayCount = days.length;
        for(let i = 0; i < dayCount; i++) {
            const daytime = days[i].daytime!;
            // We always want day icons for day forecast
            const fCode = parseInt(daytime.condition?.code ?? "") || 999;
            const fIcon = codeToIcon[fCode] ?? defaultIcon;
            const fIconName = getGIconName(fIcon.i, false);
            dayForecast.push({
                date: isoToDate(days[i].forecastStartTime),
                gIconName: fIconName,
                conditionText: gettextCondit(fIcon.c, false),
                tempMin: new Temp(cToF(days[i].temperatureMin.value)),
                tempMax: new Temp(cToF(days[i].temperatureMax.value)),
                precipChancePercent: Math.round((daytime.precipitation?.probability ?? 0) * 100)
            });
        }

        const hourForecast : Forecast[] = [ ];
        const hourCount = Math.min(hours.length, 28);
        for(let i = 0; i < hourCount; i++) {
            const fCode = parseInt(hours[i].condition?.code ?? "") || 999;
            const fIcon = codeToIcon[fCode] ?? defaultIcon;
            // QWeather uses codes 150-153 for night conditions
            const fIsNight = nightCode(fCode);
            const fIconName = getGIconName(fIcon.i, fIsNight);
            hourForecast.push({
                date: isoToDate(hours[i].forecastTime),
                gIconName: fIconName,
                conditionText: gettextCondit(fIcon.c, fIsNight),
                temp: new Temp(cToF(hours[i].temperature.value)),
                precipChancePercent: Math.round((hours[i].precipitation?.probability ?? 0) * 100)
            });
        }

        return {
            condit,
            temp,
            gIconName,
            isNight,
            observedAt,
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

function cToF(c : number) : number {
    return c * 9 / 5 + 32;
}

function mpsToMph(mps : number) : number {
    return mps / 0.44704;
}

function mmToIn(mm : number) : number {
    return mm * 0.0393701;
}

function isoToDate(ts : string | undefined, fallback : Date = new Date()) : Date {
    if(ts === undefined) return new Date(fallback.getTime());
    return new Date(ts);
}

function nightCode(code : number) : boolean {
    return code >= 150 && code <= 153;
}

// https://dev.qweather.com/docs/resource/icons/
const codeToIcon : Record<number, { c : Condition, i : string }> = {
    100: { c : Condition.CLEAR, i: Icons.Clear },

    101: { c : Condition.CLOUDY, i: Icons.Cloudy },
    102: { c : Condition.CLOUDY, i: Icons.Cloudy },
    103: { c : Condition.CLOUDY, i: Icons.Cloudy },
    104: { c : Condition.CLOUDY, i: Icons.Overcast },

    // Night variants of the above
    150: { c : Condition.CLEAR, i: Icons.Clear },
    151: { c : Condition.CLOUDY, i: Icons.Cloudy },
    152: { c : Condition.CLOUDY, i: Icons.Cloudy },
    153: { c : Condition.CLOUDY, i: Icons.Cloudy },

    300: { c : Condition.RAINY, i: Icons.RainScattered },
    301: { c : Condition.RAINY, i: Icons.Rainy },
    302: { c : Condition.STORMY, i: Icons.Stormy },
    303: { c : Condition.STORMY, i: Icons.Stormy },
    304: { c : Condition.STORMY, i: Icons.Stormy },
    305: { c : Condition.RAINY, i: Icons.RainScattered },
    306: { c : Condition.RAINY, i: Icons.Rainy },
    307: { c : Condition.RAINY, i: Icons.Rainy },
    308: { c : Condition.RAINY, i: Icons.Rainy },
    309: { c : Condition.RAINY, i: Icons.RainScattered },
    310: { c : Condition.RAINY, i: Icons.Rainy },
    311: { c : Condition.RAINY, i: Icons.Rainy },
    312: { c : Condition.RAINY, i: Icons.Rainy },
    313: { c : Condition.RAINY, i: Icons.FreezingRain },
    314: { c : Condition.RAINY, i: Icons.RainScattered },
    315: { c : Condition.RAINY, i: Icons.Rainy },
    316: { c : Condition.RAINY, i: Icons.Rainy },
    317: { c : Condition.RAINY, i: Icons.Rainy },
    318: { c : Condition.RAINY, i: Icons.Rainy },
    319: { c : Condition.RAINY, i: Icons.Rainy },
    320: { c : Condition.RAINY, i: Icons.Rainy },
    321: { c : Condition.STORMY, i: Icons.Stormy },
    322: { c : Condition.STORMY, i: Icons.Stormy },
    323: { c : Condition.RAINY, i: Icons.Rainy },
    324: { c : Condition.RAINY, i: Icons.Rainy },
    325: { c : Condition.RAINY, i: Icons.Rainy },
    326: { c : Condition.RAINY, i: Icons.Rainy },
    327: { c : Condition.RAINY, i: Icons.Rainy },
    350: { c : Condition.RAINY, i: Icons.RainScattered },
    351: { c : Condition.RAINY, i: Icons.Rainy },
    399: { c : Condition.RAINY, i: Icons.Rainy },

    400: { c : Condition.SNOWY, i: Icons.Snowy },
    401: { c : Condition.SNOWY, i: Icons.Snowy },
    402: { c : Condition.SNOWY, i: Icons.Snowy },
    403: { c : Condition.SNOWY, i: Icons.Snowy },
    404: { c : Condition.SNOWY, i: Icons.FreezingRain },
    405: { c : Condition.SNOWY, i: Icons.FreezingRain },
    406: { c : Condition.SNOWY, i: Icons.FreezingRain },
    407: { c : Condition.SNOWY, i: Icons.Snowy },
    408: { c : Condition.SNOWY, i: Icons.Snowy },
    409: { c : Condition.SNOWY, i: Icons.Snowy },
    410: { c : Condition.SNOWY, i: Icons.Snowy },
    456: { c : Condition.SNOWY, i: Icons.Snowy },
    457: { c : Condition.SNOWY, i: Icons.Snowy },
    499: { c : Condition.SNOWY, i: Icons.Snowy },

    500: { c : Condition.CLOUDY, i: Icons.Foggy },
    501: { c : Condition.CLOUDY, i: Icons.Foggy },
    502: { c : Condition.CLOUDY, i: Icons.Foggy },
    503: { c : Condition.CLOUDY, i: Icons.Foggy },
    504: { c : Condition.CLOUDY, i: Icons.Foggy },
    507: { c : Condition.CLOUDY, i: Icons.Foggy },
    508: { c : Condition.CLOUDY, i: Icons.Foggy },
    509: { c : Condition.CLOUDY, i: Icons.Foggy },
    510: { c : Condition.CLOUDY, i: Icons.Foggy },
    511: { c : Condition.CLOUDY, i: Icons.Foggy },
    512: { c : Condition.CLOUDY, i: Icons.Foggy },
    513: { c : Condition.CLOUDY, i: Icons.Foggy },
    514: { c : Condition.CLOUDY, i: Icons.Foggy },
    515: { c : Condition.CLOUDY, i: Icons.Foggy },

    900: { c : Condition.CLEAR, i: Icons.Clear },
    901: { c : Condition.CLEAR, i: Icons.Clear }
};
const defaultIcon = { c : Condition.CLOUDY, i: Icons.Cloudy };
