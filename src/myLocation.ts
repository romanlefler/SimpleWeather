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
import { LibSoup } from "./libsoup.js";
import { Config } from "./config.js";

let soup : LibSoup;
let config : Config;

let cachedMyLoc : LatLon | null = null;
let isGettingLoc : Promise<LatLon> | null = null;
let lastGotTime : Date = new Date(0);

export enum MyLocationProvider {
    IpInfoIo = 1,
    Geoclue = 2,
    Disable = 3
}

function cloneCache() : LatLon {
    return {
        lat: cachedMyLoc!.lat,
        lon: cachedMyLoc!.lon
    };
}

export function setUpMyLocation(inSoup : LibSoup, inConfig : Config) : void {
    soup = inSoup;
    config = inConfig;
}

export function freeMyLocation() {
    // @ts-ignore
    soup = undefined;
    // @ts-ignore
    config = undefined;
}
    
export async function getMyLocation() : Promise<LatLon> {
    if (cachedMyLoc) {
        const diffMin = (Date.now() - lastGotTime.getTime()) / 1000 / 60;
        // TODO: This should be a setting
        // refresh every 60 min
        if (diffMin < config.getMyLocationRefreshMin()) return cloneCache();
    }

    try {
        // This allows us to not wait for two or more different
        // async requests
        if(!isGettingLoc) {
            switch(config.getMyLocationProvider()) {
                case MyLocationProvider.IpInfoIo:
                    isGettingLoc = ipinfoGetLoc();
                    break;
                case MyLocationProvider.Geoclue:
                    isGettingLoc = geoclueGetLoc();
                    break;
                case MyLocationProvider.Disable:
                    throw new Error("My Location Disabled");
            }
        }

        cachedMyLoc = await isGettingLoc;
    }
    catch (e) {
        console.error(e);
    }
    isGettingLoc = null;
    lastGotTime = new Date();

    if (cachedMyLoc) return cachedMyLoc;

    throw new Error("Failed to get My Location.");
}

async function ipinfoGetLoc() : Promise<LatLon> {
    const params = {
        token: "c9ff6ef8fa57bd" // don't look
    };
    const resp = await soup.fetchJson("https://ipinfo.io/json", params);
    if(Math.floor(resp.status / 100) !== 2) throw new Error(`ipinfo.io responded with error ${resp.status}.`);

    const body = resp.body;
    const coords = body.loc.split(",");
    return {
        lat: parseFloat(coords[0]),
        lon: parseFloat(coords[1])
    };
}

// Geoclue will no longer work for most users since Mozilla
// has disconitnued their geolocation service
async function geoclueGetLoc() : Promise <LatLon> {
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
                catch (e : any) {
                    if (e.message &&
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
