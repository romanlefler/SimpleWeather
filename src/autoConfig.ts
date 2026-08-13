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
import Gio from "gi://Gio";
import { UnitPreset, writeGTypeAS } from "./config.js";
import { getMyLocation, MyLocResult } from "./myLocation.js";
import { Location } from "./location.js";
import { gettext as _g } from "./gettext.js"
import { getLocales, getCountryCode } from "./lang.js"
import { AutoConfigFailError } from "./errors.js"

// Denmark, Finland, Sweden, Norway, Iceland, Faroe Islands, Greenland
const NORDIC : string[] = [ "DK", "FI", "SE", "NO", "IS", "FO", "GL" ];

// If we have to just guess a city based off of locale here's gonna be our defaults
const US_COORDS : MyLocResult = { lat: 40.7834, lon: -73.9662, city: "New York", country: "US" };
const UK_COORDS : MyLocResult = { lat: 51.51279, lon: -0.09184, city: "London", country: "UK" };
const NORDIC_COORDS : MyLocResult = { lat: 51.51279, lon: -0.09184, city: "Stockholm", country: "Sverige" };
const METRIC_COORDS : MyLocResult = { lat: 52.52001, lon: 13.40495, city: "Berlin", country: "Deutschland" };

async function readFileAsync(path : string) : Promise<string | null> {

    const f = Gio.File.new_for_path(path);
    return new Promise<string | null>(resolve => {
        f.load_contents_async(null, (_, res) => {
            try {
                const [ ok, contents ] = f.load_contents_finish(res);
                if(!ok) {
                    resolve(null);
                    return;
                }
                const str = new TextDecoder().decode(contents);
                resolve(str);
                return;
            } catch(e) {
                resolve(null);
                return;
            }
        });
    });
}

/**
 * Tests if this computer is a desktop.
 * @returns True if a desktop, otherwise false if not or unknown.
 */
async function isDesktop() : Promise<boolean> {
    const str = await readFileAsync("/sys/class/dmi/id/chassis_type");
    // Return false if file read failed
    if(!str) return false;

    // Chassis 3 = desktop
    return str === "3\n";
}

/**
 * Guesses based on the specific computer what settings
 * he/she will want.
 */
export async function setFirstTimeConfig(settings : Gio.Settings) {

    let myLoc : MyLocResult | null = null;
    let cc : string | null = null;
    try {
        myLoc = await getMyLocation();
        cc = myLoc.country;
        if(cc === "UK") cc = "GB";
    } catch(e) {
        console.log("SimpleWeather caught get my location error in autoconfig.");
        // Otherwise let's guess country based on locale
        // Basically we hope we see a locale like en_US and extract the country code
        const locales = getLocales();
        if(!locales) throw new AutoConfigFailError();
        for(let l of locales) {
            cc = getCountryCode(l);
            if(cc) break;
        }
        if(!cc) throw new AutoConfigFailError();
    }

    if(cc === "US") {
        settings.set_enum("unit-preset", UnitPreset.US);
        if(!myLoc) myLoc = US_COORDS;
    }
    else if(cc === "UK" || cc === "GB") {
        settings.set_enum("unit-preset", UnitPreset.UK);
        if(!myLoc) myLoc = UK_COORDS;
    }
    else if(cc && NORDIC.includes(cc)) {
        settings.set_enum("unit-preset", UnitPreset.Nordic);
        if(!myLoc) myLoc = NORDIC_COORDS;
    }
    else {
        settings.set_enum("unit-preset", UnitPreset.Metric);
        if(!myLoc) myLoc = METRIC_COORDS;
    }

    // If it isn't a laptop then set your location once and never query the server again
    if(await isDesktop()) {
        const loc = Location.newCoords(myLoc.city ?? _g("Unnamed Location"), myLoc.lat, myLoc.lon);
        const strArr = [ loc.toString() ];
        settings.set_value("locations", writeGTypeAS(strArr));
    }

}
