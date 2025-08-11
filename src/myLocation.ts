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

// @ts-ignore - no typescript declarations for Geoclue or Geocode
import Geoclue from "gi://Geoclue";
// @ts-ignore
import Geocode from "gi://GeocodeGlib";

import { LatLon } from "./location.js";
import { NoLocServiceError } from "./errors.js";
import { LibSoup } from "./libsoup.js";
import { Config } from "./config.js";

let soup : LibSoup;
let config : Config;

let cachedMyLoc : MyLocResult | null = null;
let isGettingLoc : Promise<MyLocResult> | null = null;
let lastGotTime : Date = new Date(0);

export enum MyLocationProvider {
    IpInfoIo = 1,
    Geoclue = 2,
    Disable = 3,
    Ipapi = 4
}

export interface MyLocResult extends LatLon {
    city : string | null;
    country : string | null;
}

function cloneCache() : MyLocResult {
    return {
        lat: cachedMyLoc!.lat,
        lon: cachedMyLoc!.lon,
        city: cachedMyLoc!.city,
        country: cachedMyLoc!.country
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
    
export async function getMyLocation() : Promise<MyLocResult> {
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
                case MyLocationProvider.Ipapi:
                    isGettingLoc = ipapiGetLoc();
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

async function ipinfoGetLoc() : Promise<MyLocResult> {
    const params = {
        token: "c9ff6ef8fa57bd" // don't look
    };
    const resp = await soup.fetchJson("https://ipinfo.io/json", params);
    if(!resp.is2xx) throw new Error(`ipinfo.io responded with error ${resp.status}.`);

    const body = resp.body;
    const coords = body.loc.split(",");
    return {
        lat: parseFloat(coords[0]),
        lon: parseFloat(coords[1]),
        city: body.city ?? null,
        country: body.country ?? null
    };
}

async function ipapiGetLoc() : Promise<MyLocResult> {
    const resp = await soup.fetchJson("https://ipapi.co/json", { });
    const body = resp.body;
    return {
        lat: body.latitude,
        lon: body.longitude,
        city: body.city ?? null,
        country: body.country_code ?? null
    };
}

async function reverseGeocode(lat : number, lon : number) : Promise<MyLocResult> {
    return new Promise<MyLocResult>((resolve, reject) => {
        console.error(`Reverse geocoding ${lat}, ${lon}`);
        const loc = new Geocode.Location({
            latitude: lat,
            longitude: lon
        });
        const rev = Geocode.Reverse.new_for_location(loc);
        rev.resolve_async(
            null,
            (_rev : any, result : any) => {
                try {
                    const place = rev.resolve_finish(result);
                    const ret : MyLocResult = {
                        lat,
                        lon,
                        city: place.get_town() || null,
                        country: place.get_country() || null
                    }
                    resolve(ret);
                } catch(e) {
                    reject(e);
                }
            }
        );
    });
}

// Geoclue will no longer work for most users since Mozilla
// has discontinued their geolocation service
async function geoclueGetLoc() : Promise <MyLocResult> {
    return new Promise<MyLocResult>((resolve, reject) => {
        Geoclue.Simple.new(
            "simpleweather",
            Geoclue.AccuracyLevel.NEIGHBORHOOD,
            null,
            (_ : any, result : any) => {
                let loc : any;
                try {
                    const simple = Geoclue.Simple.new_finish(result);
                    loc = simple.get_location();
                } catch (e : any) {
                    if (e.message &&
                        e.message.includes("org.freedesktop.DBus.Error.AccessDenied")) {
                        reject(new NoLocServiceError());
                        return;
                    }
                    reject(e);
                    return;
                }
                reverseGeocode(loc.latitude, loc.longitude).then(
                    res => {
                        resolve(res);
                    },
                    err => {
                        console.error(`Failed to reverse geocode location from Geoclue: ${err}`);
                        const ret : MyLocResult = {
                            lat: loc.latitude,
                            lon: loc.longitude,
                            city: null,
                            country: null
                        };
                        resolve(ret);
                    }
                );
            }
        );
    });
}
