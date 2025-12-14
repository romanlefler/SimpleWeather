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

import GLib from "gi://GLib";
import { Weather } from "./weather.js";
import { Config } from "./config.js";
import { Direction, DirectionUnits, Pressure, RainMeasurement, RainMeasurementUnits, Speed, Temp } from "./units.js";
import { sameDate } from "./utils.js";
import { gettext as _g } from "./gettext.js"

let locales : string[] | undefined;

/**
 * Initializes locales for use in JavaScript.
 * @returns Undefined upon success, or the error message
 */
export function initLocales() : string | undefined {
    // GLib gets locales from env variables
    const gLibLocales = GLib.get_language_names();
    const out : string[] = [ ];
    for(let i = 0; i < gLibLocales.length; i++) {

        let k = gLibLocales[i];
        // C and POSIX are not valid JS locales
        if(strcaseeq(k, "C") || strcaseeq(k, "POSIX")) continue;
        // "en.UTF-8" is valid system locale but in JS
        // it is not
        if(strcaseends(k, ".UTF-8")) continue;
        if(strcaseends(k, ".utf8")) continue;
        // "en_US" is system locale but JS locale should be "en-US"
        // or Intl will throw
        k = k.replace(/_/g, "-");

        out.push(k);
    }
    // Always add "en" as a backup, this is effectively the same as "C"
    out.push("en");
    
    try {
        // This is just to get it to throw if tags are invalid
        const _ = new Intl.DateTimeFormat(out);
    } catch(e) {
        if(e instanceof RangeError) {
            console.error(e);
            locales = undefined;
            return e.message;
        }
        else throw e;
    }

    locales = out;
    return undefined;
}

/**
 * Compares if two ASCII strings are case-insensitive equals.
 * This just compares toUpperCase on both strings.
 * @param s1 String 1
 * @param s2 String 2
 * @returns True if equal
 */
export function strcaseeq(s1 : string, s2 : string) : boolean {
    // We'll only be doing this for ASCII chars so this is fine
    return s1.toUpperCase() === s2.toUpperCase();
}

export function strcaseends(s1 : string, suffix : string) : boolean {
    return s1.toUpperCase().endsWith(suffix.toUpperCase());
}

export function getLocales() : string[] | undefined {
    return locales;
}

export function displayTemp(t : Temp, cfg : Config) : string {
    const tempUnit = cfg.getTempUnit();
    return `${Math.round(t.get(tempUnit))}\u00B0`;
}

export function displayTime(d : Date, cfg : Config, showAmPm : boolean = true) : string {
    const locale = getLocales();
    const is24 = cfg.is24HourClock();
    const opts : Intl.DateTimeFormatOptions = {
        hour: "numeric",
        minute: "2-digit",
        hour12: is24 === null ? undefined : !is24
    };
    let str = d.toLocaleTimeString(locale, opts);
    
    if(!showAmPm && (str.endsWith(" AM") || str.endsWith(" PM"))) {
        str = str.slice(0, -3);
    }

    return str;
}

export function displayDayOfWeek(d : Date, useToday = false) : string {
    if(useToday && sameDate(new Date(), d)) return _g("Today");

    const map = [
        _g("Sunday"), _g("Monday"), _g("Tuesday"), _g("Wednesday"),
        _g("Thursday"), _g("Friday"), _g("Saturday")
    ];
    const idx = d.getDay();
    return map[idx];
};

export function displaySpeed(s : Speed, cfg : Config) {
    const unit = cfg.getSpeedUnit();
    const suffices = [ "mph", "m/s", "km/h", "kts", "ft/s", "bft" ];
    return `${Math.round(s.get(unit))} ${suffices[unit - 1]}`;
}

export function displayDirection(d : Direction, cfg : Config) {
    const unit = cfg.getDirectionUnit();
    const suffix = unit === DirectionUnits.Degrees ? "\u00B0" : "";
    let val = d.get(unit);
    if(typeof val === "number") val = Math.round(val);
    return `${val}${suffix}`;
}

export function displayPressure(p : Pressure, cfg : Config) {
    const unit = cfg.getPressureUnit();
    const suffices = [ "inHg", "hPa", "mmHg" ];
    return `${Math.round(p.get(unit))} ${suffices[unit - 1]}`;
}

export function displayRainMeasurement(r : RainMeasurement, cfg : Config) {
    const unit = cfg.getRainMeasurementUnit();
    const suffices = [ "\"", " mm", " cm", " pts" ];
    
    let num = r.get(unit);
    let rounded;
    if(unit === RainMeasurementUnits.In || unit === RainMeasurementUnits.Pt) {
        rounded = num % 1 === 0 ? String(num) : num.toFixed(1);
    } else rounded = String(Math.round(num));

    return `${rounded}${suffices[unit - 1]}`;
}
