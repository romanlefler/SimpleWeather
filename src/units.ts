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
import { UnitError } from "./errors.js";
import { displayDirection, displayPressure, displayRainMeasurement, displaySpeed, displayTemp } from "./lang.js";
import { gettext as _g } from "./gettext.js";

/*
    The measures are classes.
    This is to make it harder to make unit mistakes.
    There is also a Displayable interface to abstract displaying them.
*/

export interface Displayable {
    display : (cfg : Config) => string;
}

export enum TempUnits {
    Fahrenheit = 1,
    Celsius = 2
}

export class Temp implements Displayable {

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

    display(cfg : Config) : string {
        return displayTemp(this, cfg);
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

export class Speed implements Displayable {

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

    display(cfg : Config) : string {
        return displaySpeed(this, cfg);
    }
}

export enum DirectionUnits {
    Degrees = 1,
    EightPoint = 2
}

export class Direction implements Displayable {

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
                const map = [ _g("N"), _g("NE"), _g("E"), _g("SE"), _g("S"), _g("SW"), _g("W"), _g("NW"), _g("N") ];
                return map[point];
            default:
                throw new UnitError("Direction unit invalid.");
        }
    }

    display(cfg : Config) : string {
        return displayDirection(this, cfg);
    }
}

export enum PressureUnits {
    InHg = 1,
    HPa = 2,
    MmHg = 3
}

export class Pressure implements Displayable {

    #inHg : number;

    constructor(inHg : number) {
        this.#inHg = inHg;
    }

    get(unit : PressureUnits) : number {
        switch(unit) {
            case PressureUnits.InHg:
                return this.#inHg;
            case PressureUnits.HPa:
                return this.#inHg * 33.86389;
            case PressureUnits.MmHg:
                return this.#inHg * 25.4;
            default:
                throw new UnitError("Pressure unit invalid.");
        }
    }

    display(cfg : Config) : string {
        return displayPressure(this, cfg);
    }
}

export enum RainMeasurementUnits {
    In = 1,
    Mm = 2,
    Cm = 3,
    Pt = 4
}

export class RainMeasurement implements Displayable {

    #inches : number;

    constructor(inches : number) {
        this.#inches = inches;
    }

    get(unit : RainMeasurementUnits) : number {
        switch(unit) {
            case RainMeasurementUnits.In:
                return this.#inches;
            case RainMeasurementUnits.Mm:
                return this.#inches * 25.4;
            case RainMeasurementUnits.Cm:
                return this.#inches * 2.54;
            case RainMeasurementUnits.Pt:
                return this.#inches * 0.01;
            default:
                throw new UnitError("Rain measurement unit invalid.");
        }
    }

    display(cfg : Config) : string {
        return displayRainMeasurement(this, cfg);
    }
}

export enum DistanceUnits {
    Mi = 1,
    Km = 2,
    Ft = 3,
    M = 4
}

export class Distance implements Displayable {

    #miles : number;

    constructor(miles : number) {
        this.#miles = miles;
    }

    get(unit : DistanceUnits) : number {
        switch(unit) {
            case DistanceUnits.Mi:
                return this.#miles;
            case DistanceUnits.Km:
                return this.#miles * 1.609344;
            case DistanceUnits.Ft:
                return this.#miles * 5280;
            case DistanceUnits.M:
                return this.#miles * 1609.344;
            default:
                throw new UnitError("Distance unit invalid.");
        }
    }

    display(cfg : Config) : string {
        const suffices = [ "mi", "km", "ft", "m" ];
        const unit = cfg.getDistanceUnit();
        return `${this.get(unit)} ${suffices[unit]}`;
    }
}


export class SpeedAndDir implements Displayable {

    #speed : Speed;
    #dir : Direction;

    constructor(speed : Speed, dir : Direction) {
        this.#speed = speed;
        this.#dir = dir;
    }

    display(cfg : Config) : string {
        return displayDirection(this.#dir, cfg) + ", " +
            displaySpeed(this.#speed, cfg);
    }

}

export class Percentage implements Displayable {
    #percentage : number;
    constructor(zeroToOneHundred : number) {
        this.#percentage = zeroToOneHundred;
    }
    get() : number {
        return this.#percentage;
    }
    display(_cfg : Config) : string {
        return `${Math.round(this.#percentage)}%`;
    }
}

export class GettextKey implements Displayable {
    #key : string;
    constructor(key : string) {
        this.#key = key;
    }
    display(_cfg : Config) : string {
        return _g(this.#key);
    }
}

