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

import { IDetails } from "./details.js";
import { Location } from "./location.js";
import { Direction, Humidity, Pressure, RainMeasurement, Speed, SpeedAndDir, Temp } from "./units.js";

export interface Weather extends IDetails {

    temp : Temp;

    gIconName : string;

    isNight : boolean;

    sunset : Date;

    sunrise : Date;

    // each item is 1 day apart
    forecast : Forecast[];

    // each item is 1 hour apart
    hourForecast : Forecast[];

    feelsLike : Temp;

    wind : Speed;

    gusts : Speed;

    windDir : Direction,

    humidity: Humidity;

    pressure : Pressure;

    uvIndex : number;

    precipitation : RainMeasurement;

    providerName : string;

    loc : Location;

    windSpeedAndDir : SpeedAndDir;

}

export interface Forecast {

    date : Date;

    gIconName : string;

    temp? : Temp;

    tempMin? : Temp;

    tempMax? : Temp;

    // Should be 0 - 100
    precipChancePercent : number;

}
