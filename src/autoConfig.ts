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
import { writeGTypeAS } from "./config.js";
import { getMyLocation } from "./myLocation.js";
import { Location } from "./location.js";
import { gettext as _g } from "./gettext.js"
import { SpeedUnits, TempUnits } from "./units.js";

/**
 * Tests if this computer is a desktop.
 * @returns True if a desktop, otherwise false if not or unknown.
 */
function isDesktop() : boolean {
    const fileResult = GLib.file_get_contents("/sys/class/dmi/id/chassis_type");
    // Return false if file read failed
    if(!fileResult[0]) return false;

    const str = new TextDecoder().decode(fileResult[1]);
    // Chassis 3 = desktop
    return str === "3\n";
}

/**
 * Guesses based on the specific computer what settings
 * he/she will want.
 */
export async function setFirstTimeConfig(settings : Gio.Settings) {

    const myLoc = await getMyLocation();

    // If it isn't a laptop then set your location once and never query the server again
    if(isDesktop()) {
        const loc = Location.newCoords(myLoc.city ?? _g("My Location"), myLoc.lat, myLoc.lon);
        const strArr = [ loc.toString() ];
        settings.set_value("locations", writeGTypeAS(strArr));
    }

    if(myLoc.country === "US") {
        settings.set_enum("temp-unit", TempUnits.Fahrenheit);
        settings.set_enum("speed-unit", SpeedUnits.Mph);
    }
    else if(myLoc.country === "UK" || myLoc.country === "GB") {
        settings.set_enum("temp-unit", TempUnits.Celsius);
        settings.set_enum("speed-unit", SpeedUnits.Mph);
    }
    else {
        settings.set_enum("temp-unit", TempUnits.Celsius);
        settings.set_enum("speed-unit", SpeedUnits.Kph);
    }

}
