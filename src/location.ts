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

import { getMyLocation } from "./myLocation.js";

const latlonRegex = /^([0-9]+\.?[0-9]*),([0-9]+\.?[0-9]*)$/;

export interface LatLon {
    lat : number;
    lon : number;
}

export class Location {

    /**
     * True if this is the special location "here"
     */
    #isHere : boolean;

    #lat? : number;
    #lon? : number;

    #name? : string;

    private constructor(name? : string, isHere? : boolean, lat? : number, lon? : number) {
        this.#name = name;
        this.#isHere = isHere ?? false;
        this.#lat = lat;
        this.#lon = lon;
    }

    getName() : string {
        return this.#name ?? "My Location";
    }

    getRawName() : string | null {
        return this.#name ?? null;
    }

    getDescription() : string {
        return this.#isHere ? "My Location" : this.getCoordsString();
    }

    isHere() : boolean {
        return this.#isHere;
    }

    async latLon() : Promise<LatLon> {
        if(this.#isHere) return await getMyLocation();
        else return { lat: this.#lat!, lon: this.#lon! };
    }

    getCoordsString() {
        const isNorth = this.#lat! >= 0;
        const isEast = this.#lon! >= 0;
        const latFmt = isNorth ? "%f\u00B0N" : "%f\u00B0S";
        const lonFmt = isEast ? "%f\u00B0E" : "%f\u00B0W";
        const latStr = Math.abs(this.#lat!).toLocaleString();
        const lonStr = Math.abs(this.#lon!).toLocaleString();
        return `${latFmt.format(latStr)} ${lonFmt.format(lonStr)}`;
    }

    toString() {
        const obj : Record<string, any> = {
            name: this.#name
        };
        if(this.#isHere) obj.isHere = true;
        if(this.#lat) {
            obj.lat = this.#lat;
            obj.lon = this.#lon;
        }

        return JSON.stringify(obj);
    }

    static parse(s : string) : Location | null {
        let obj;
        try {
            obj = JSON.parse(s);
        }
        catch(e) {
            return null;
        }

        const containsLat = typeof obj.lat !== "undefined";
        const containsLon = typeof obj.lon !== "undefined";

        // Only here can omit the name
        if(!obj.isHere && !obj.name) return null;
        // isHere must be undefined or bool
        if(typeof obj.isHere !== "undefined" && typeof obj.isHere !== "boolean") return null;
        // lat must be undefined or number
        if(containsLat && typeof obj.lat !== "number") return null;
        // lon must be undefined or number
        if(containsLon && typeof obj.lon !== "number") return null;
        // either neither lat or lon or both lon and lat
        if(containsLat !== containsLon) return null;

        return new Location(
            obj.name ?? undefined,
            obj.isHere,
            obj.lat,
            obj.lon
        );
    }

    static newCoords(name : string, lat : number, lon : number) : Location {
        return new Location(name, false, lat, lon);
    }

    static newHere(name? : string) : Location {
        return new Location(name, true);
    }

}
