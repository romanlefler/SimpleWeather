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
import { getMyLocation } from "./myLocation.js";
import { Location } from "./location.js";
import { gettext as _g } from "./gettext.js"
import { AutoConfigFailError } from "./errors.js";

// Denmark, Finland, Sweden, Norway, Iceland, Faroe Islands, Greenland
const NORDIC : string[] = [ "DK", "FI", "SE", "NO", "IS", "FO", "GL" ];

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

    let myLoc;
    try {
        myLoc = await getMyLocation();
    } catch(e) {
        console.log("Caught get my location error in autoconfig.");
        throw new AutoConfigFailError();
    }

    // If it isn't a laptop then set your location once and never query the server again
    if(await isDesktop()) {
        const loc = Location.newCoords(myLoc.city ?? _g("My Location"), myLoc.lat, myLoc.lon);
        const strArr = [ loc.toString() ];
        settings.set_value("locations", writeGTypeAS(strArr));
    }

    const cc = myLoc.country;
    if(cc === "US") {
        settings.set_enum("unit-preset", UnitPreset.US);
    }
    else if(cc === "UK" || cc === "GB") {
        settings.set_enum("unit-preset", UnitPreset.UK);
    }
    else if(cc && NORDIC.includes(cc)) {
        settings.set_enum("unit-preset", UnitPreset.Nordic);
    }
    else {
        settings.set_enum("unit-preset", UnitPreset.Metric);
    }

}
