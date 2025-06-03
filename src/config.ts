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
import { TempUnits } from "./units.js";
import { Location } from "./location.js";

export class Config {

    #settings? : Gio.Settings;
    #handlerIds : number[];

    constructor(settings : Gio.Settings) {
        this.#settings = settings;
        this.#handlerIds = [ ];
    }

    free() {
        while(this.#handlerIds.length > 0) {
            const id = this.#handlerIds.pop()!;
            this.#settings?.disconnect(id);
        }
        this.#settings = undefined;
    }

    getTempUnit() : TempUnits {
        return this.#settings!.get_enum("temp-unit");
    }

    onTempUnitChanged(callback : () => void) {
        const id = this.#settings!.connect("changed", (_, key) => {
            if(key === "temp-unit") callback();
        });
        this.#handlerIds.push(id);
    }

    getLocations() : Location[] {
        const gVariant = this.#settings!.get_value("locations");
        const stringArr = readGTypeAS(gVariant);
        const locArr = stringArr.map(k => Location.parse(k));

        const filtered = locArr.filter(l => l !== null) as Location[];
        if(filtered.length === 0) {
            const newLoc = Location.newHere();
            filtered.push(newLoc);
        }
        return filtered;
    }

    onLocationsChanged(callback : () => void) {
        const id = this.#settings!.connect("changed", (_, key) => {
            if(key === "locations") callback();
        });
        this.#handlerIds.push(id);
    }

    getMainLocation() : Location {
        const inx = this.#settings!.get_int64("main-location-index");
        const arr = this.getLocations();
        return arr[inx] ?? arr[0];
    }

    onMainLocationChanged(callback : () => void) {
        // Using change-event instead of changed makes sure
        // that the callback isn't double-fired since either
        // key causes a change
        const id = this.#settings!.connect("change-event", (_, quarks) => {
            // Returning false continues to call changed events
            if(!quarks) return false;

            for(let q of quarks) {
                const s = GLib.quark_to_string(q);
                if(s === "locations" || s === "main-location-index") {
                    callback();
                    return false;
                }
            }

            return false;
        });
        this.#handlerIds.push(id);
    }

    getMainLocationIndex() : number {
        return this.#settings!.get_int64("main-location-index");
    }

    onMainLocationIndexChanged(callback : () => void) {
        const id = this.#settings!.connect("changed", (_, key) => {
            if(key === "main-location-index") callback();
        });
        this.#handlerIds.push(id);
    }

}

function readGTypeAS(gvariant : GLib.Variant<any>) : string[] {
    const len = gvariant.n_children();

    const arr : string[] = [];
    for (let i = 0; i < len; i++) {
        const gString = gvariant.get_child_value(i);
        const s = gString.get_string()[0];
        arr.push(s);
    }

    return arr;
}

export function writeGTypeAS(arr : string[]) : GLib.Variant<any> {
    const gVariantArr = [ ];
    for(let k of arr) {
        const gv = GLib.Variant.new_string(k);
        gVariantArr.push(gv);
    }
    return GLib.Variant.new_array(
        new GLib.VariantType("s"),
        gVariantArr
    );
}
