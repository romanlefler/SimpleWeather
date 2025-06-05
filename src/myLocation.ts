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

// @ts-ignore - no typescript declarations for Geoclue
import Geoclue from "gi://Geoclue";

import { LatLon } from "./location.js";
import { NoLocServiceError } from "./errors.js";

let cachedMyLoc : LatLon | null = null;
let isGettingLoc : boolean = false;
let lastGotTime : Date = new Date(0);

function cloneLatLon(loc : LatLon) {
    return { lat: loc.lat, lon: loc.lon };
}

export async function getMyLoc() : Promise<LatLon> {
    if(cachedMyLoc) {
        const diffMin = (Date.now() - lastGotTime.getTime()) / 1000 / 60;
        // refresh every 10 min
        if(diffMin < 10.0) return cloneLatLon(cachedMyLoc);
    }

    isGettingLoc = true;
    try {
        cachedMyLoc = await geoclueGetLoc();
    }
    catch(e) {
        console.error(e);
    }
    isGettingLoc = false;
    lastGotTime = new Date();

    if(cachedMyLoc) return cachedMyLoc;

    throw new Error("Failed to get My Location.");
}

async function geoclueGetLoc() : Promise<LatLon> {
    return new Promise<LatLon>((resolve, reject) => {
        Geoclue.Simple.new(
            "simpleweather",
            Geoclue.AccuracyLevel.NEIGHBORHOOD,
            null,
            (_ : any, result : any) => {
                let loc;
                try {
                    let simple = Geoclue.Simple.new_finish(result);
                    loc = simple.get_location();
                }
                catch(e : any) {
                    if(e.message &&
                    e.message.includes("org.freedesktop.DBus.Error.AccessDenied")) {
                        reject(new NoLocServiceError());
                        return;
                    }
                    reject(e);
                    return;
                }

                let ret : LatLon = {
                    lat: loc.latitude,
                    lon: loc.longitude
                };
                resolve(ret);
            }
        );
    });
}
