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
import { Direction, Pressure, RainMeasurement, RainMeasurementUnits, Speed, SpeedAndDir, Temp } from "../units.js";
import { Forecast, Weather } from "../weather.js";
import { getGIconName, Icons } from "../icons.js"
import { Provider } from "./provider.js";
import { getTimezoneName } from "../utils.js";
import { Location } from "../location.js";

const ENDPOINT = "https://api.open-meteo.com/v1/forecast";

export class OpenMeteo implements Provider {

    readonly #soup : LibSoup;
    readonly #config : Config;

    readonly nameKey = "Open-Meteo";

    constructor(soup : LibSoup, config : Config) {
        this.#soup = soup;
        this.#config = config;
    }

    async #fetch(loc : Location) : Promise<any> {

        const coords = await loc.latLon();

        const params = {
            latitude: String(coords.lat),
            longitude: String(coords.lon),
            current: "temperature_2m,weather_code,is_day,relative_humidity_2m," +
                "apparent_temperature,surface_pressure,wind_speed_10m,wind_gusts_10m," +
                "wind_direction_10m,precipitation,cloud_cover",
            daily: "sunset,sunrise,weather_code,temperature_2m_min,temperature_2m_max," +
                "precipitation_probability_max,uv_index_max,cloud_cover_mean,precipitation_sum",
            hourly: "temperature_2m,weather_code,precipitation_probability,is_day,cloud_cover," +
                "precipitation",
            // Note that 24 is not the max
            forecast_hours: "28",
            temperature_unit: "fahrenheit",
            wind_speed_unit: "mph",
            precipitation_unit: "inch",
            timezone: getTimezoneName()
        };

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
        const loc = this.#config.getMainLocation();
        const body = await this.#fetch(loc);
        const cur = body.current!;
        const daily = body.daily!;
        const hourly = body.hourly!;

        const temp = new Temp(cur.temperature_2m);
        const feelsLike = new Temp(cur.apparent_temperature);
        const wind = new Speed(cur.wind_speed_10m);
        const gusts = new Speed(cur.wind_gusts_10m);
        const windDir = new Direction(cur.wind_direction_10m);
        const humidity : number = cur.relative_humidity_2m;
        // hPa to inHg
        const pressure = new Pressure(cur.surface_pressure * 0.02953);
        const uvIndex = daily.uv_index_max[0];
        const isNight = cur.is_day === 0;
        const precipitation = new RainMeasurement(cur.precipitation);

        const weatherCode = fixWeatherCode(cur.weather_code, cur.cloud_cover, precipitation);
        const icon = codeToIcon[weatherCode];
        const gIconName = getGIconName(icon, isNight);

        // If sunrise/sunset have already happened, take the next day's
        const now = new Date();
        let sunrise = new Date(body.daily.sunrise[0]);
        if(now > sunrise) sunrise = new Date(body.daily.sunrise[1]);
        let sunset = new Date(body.daily.sunset[0]);
        if(now > sunset) sunset = new Date(body.daily.sunset[1]);

        const dayForecast : Forecast[] = [ ];
        const dayCount = daily.time.length;
        for(let i = 0; i < dayCount; i++) {
            const fDateStr = daily.time[i];
            const fPrecipitation = new RainMeasurement(daily.precipitation_sum[i]);
            const fCloudCover = daily.cloud_cover_mean[i];
            // We always want day icons for day forecast
            const fWeatherCode = fixWeatherCode(daily.weather_code[i],
                fCloudCover, fPrecipitation);
            const fIcon = codeToIcon[fWeatherCode];
            const fIconName = getGIconName(fIcon, false);
            dayForecast.push({
                // This T00 thing tells the parser to assume local time (which we must do)
                date: new Date(`${fDateStr}T00:00:00`),
                gIconName: fIconName,
                tempMin: new Temp(daily.temperature_2m_min[i]),
                tempMax: new Temp(daily.temperature_2m_max[i]),
                precipChancePercent: daily.precipitation_probability_max[i]
            });
        }

        const hourForecast : Forecast[] = [ ];
        const hourCount = hourly.time.length;
        for(let i = 0; i < hourCount; i++) {
            const fDateStr = hourly.time[i];
            const fPrecipitation = new RainMeasurement(hourly.precipitation[i]);
            const fCloudCover = hourly.cloud_cover[i];
            const fIsNight = hourly.is_day[i] === 0;
            const fWeatherCode = fixWeatherCode(hourly.weather_code[i],
                fCloudCover, fPrecipitation);
            const fIcon = codeToIcon[fWeatherCode];
            const fIconName = getGIconName(fIcon, fIsNight);
            hourForecast.push({
                date: new Date(fDateStr),
                gIconName: fIconName,
                temp: new Temp(hourly.temperature_2m[i]),
                precipChancePercent: hourly.precipitation_probability[i]
            });
        }

        return {
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
            windSpeedAndDir: new SpeedAndDir(wind, windDir),
            providerName: this.nameKey,
            loc
        };
    }

}

function fixWeatherCode(code : number, cloudPercent : number, precip : RainMeasurement) : number {
    // Compensate for https://github.com/open-meteo/open-meteo/issues/812
    // Often the CAPE might be over 3000 J/kg but it's completely sunny outside
    if(code === 95) {
        if(cloudPercent < 40 && precip.get(RainMeasurementUnits.In) < 0.1) {
            // In Open-Meteo's WeatherCode.swift calculate function
            // cloud cover >= 20% is weather code 1
            if(cloudPercent >= 20) return 1;
            else return 0;
        }
        else return code;
    }
    else return code;
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
