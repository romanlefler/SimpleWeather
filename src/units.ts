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

import { UnitError } from "./errors.js";

/*
    The measures are classes.
    This is to make it harder to make unit mistakes.
*/

export enum TempUnits {
    Fahrenheit = 1,
    Celsius = 2
}

export class Temp {

    #fahrenheit : number;

    constructor(fahrenheit : number) {
        this.#fahrenheit = fahrenheit;
    }

    get(units : TempUnits) : number {
        switch(units) {
            case TempUnits.Fahrenheit:
                return this.#fahrenheit;
            case TempUnits.Celsius:
                return (this.#fahrenheit - 32.0) / 1.8;
            default:
                throw new UnitError("Temperature unit invalid.");
        }
    }
}

export enum SpeedUnits {
    Mph = 1,
    Mps = 2,
    Kph = 3,
    Kn = 4,
    Fps = 5,
    Beaufort = 6
}

export class Speed {

    #mph : number;

    constructor(mph : number) {
        this.#mph = mph;
    }

    get(units : SpeedUnits) : number {
        switch(units) {
            case SpeedUnits.Mph:
                return this.#mph;
            case SpeedUnits.Mps:
                return this.#mph * 0.44704;
            case SpeedUnits.Kph:
                return this.#mph * 1.609344;
            case SpeedUnits.Kn:
                return this.#mph * 0.868976;
            case SpeedUnits.Fps:
                return this.#mph * 1.466667;
            case SpeedUnits.Beaufort:
                // The upper end of the scale of each Beaufort number
                // Numbers obtained from Wikipedia
                const maxes = [ 1, 3, 7, 12, 18, 24, 31, 38, 46, 54, 63, 72 ];
                for(let i = 0; i < maxes.length; i++) {
                    if(this.#mph <= maxes[i]) return i;
                }
                // Anything > 72 mph is a 12
                return 12;
            default:
                throw new UnitError("Speed unit invalid.");
        }
    }
}

export enum DirectionUnits {
    Degrees = 1,
    EightPoint = 2
}

export class Direction {

    #degrees : number;

    constructor(degrees : number) {
        let deg = degrees % 360;
        if(deg < 0) deg += 360;
        this.#degrees = deg;
    }

    get(unit : DirectionUnits) : number | string {
        switch(unit) {
            case DirectionUnits.Degrees:
                return this.#degrees;
            case DirectionUnits.EightPoint:
                const point = Math.round(this.#degrees / (360 / 8));
                // While it's not possible to be exactly 8 (second N),
                // We could round up to 8 since 7.9 and others are valid inputs
                const map = [ "N", "NE", "E", "SE", "S", "SW", "W", "NW", "N" ];
                return map[point];
            default:
                throw new UnitError("Direction unit invalid.");
        }
    }
}

export enum PressureUnits {
    HPa = 1
}

export class Pressure {

    #hPa : number;

    constructor(hPa : number) {
        this.#hPa = hPa;
    }

    get(unit : PressureUnits) : number {
        switch(unit) {
            case PressureUnits.HPa:
                return this.#hPa;
            default:
                throw new UnitError("Pressure unit invalid.");
        }
    }
}
