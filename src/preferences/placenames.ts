/*
    Copyright 2026 Roman Lefler

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

export interface NominatimPlace {
    // British spelling
    licence : string;

    lat : string,
    lon : string,
    addresstype: string;
    name : string;
    display_name : string;
    address : NominatimAddress;
}

export interface NominatimAddress {

    county? : string;
    state? : string,
    country : string,
    country_code : string;

    [ key: string ] : string | undefined;
}

// Searches an address for each field in order returning it when found
function priority(addr : NominatimAddress, arr : string[]) : string | null {
    for(let k of arr) {
        const v : any = addr[k];
        if(typeof v === "string") return v;
    }
    return null;
}

// Countries in this list will not show a State-like
const HIDE_STATE : string[] =
    [ "fr", "nl", "pt", "ie", "no", "dk", "se", "fi" ];

// Neighborhood-level fields
const NEIGHBORHOOD_LIKE : string[] =
    [ "neighbourhood", "suburb", "quarter", "city_district", "borough" ];
// Island-level fields
const ISLAND_LIKE : string[] =
    [ "island", "archipelago" ];
// City-like fields
const CITY_LIKE : string[] =
    [ "city", "town", "village", "hamlet", "municipality" ];
// State-like fields
const STATE_LIKE : string[] =
    [ "state", "region", "province", "prefecture", "state_district" ];

function neighborhood(a : NominatimAddress) : string {
    const s = priority(a, NEIGHBORHOOD_LIKE);
    return s ? `${s}, ${island(a)}` : island(a);
}
function island(a : NominatimAddress) : string {
    const s = priority(a, ISLAND_LIKE);
    return s ? `${s}, ${city(a)} ` : city(a);
}
function city(a : NominatimAddress) : string {
    const s = priority(a, CITY_LIKE);

    let next : string;
    if(HIDE_STATE.includes(a.country_code)) {
        next = country(a);
    } else {
        next = state(a);
    }

    return s ? `${s}, ${next}` : next;
}
function state(a : NominatimAddress) : string {
    const s = priority(a, STATE_LIKE);
    return s ? `${s}, ${country(a)}` : country(a);
}
function country(a : NominatimAddress) : string {
    switch(a.country_code) {
        case "us":
            return "US";
        case "gb":
            return "UK";
        default:
            return a.country;
    }
}
function county(a : NominatimAddress) : string | null {
    const s = a.county;
    return s ? `${s}, ${state(a)}` : null;
}

// Fix display names being weird or too long
export function getDisplayName(p : NominatimPlace) : string {
    const addr = p.address;

    const ty = p.addresstype;
    const def = p.display_name;

    if(NEIGHBORHOOD_LIKE.includes(ty)) {
        return neighborhood(addr) ?? def;
    } else if(ISLAND_LIKE.includes(ty)) {
        return island(addr) ?? def;
    } else if(CITY_LIKE.includes(ty)) {
        return city(addr) ?? def;
    } else if(ty === "county") {
        return county(addr) ?? def;
    } else if(STATE_LIKE.includes(ty)) {
        return state(addr) ?? def;
    } else if(ty === "country") {
        return country(addr) ?? def;
    } else {
        console.log(
            `SimpleWeather: unrecognized address type: ${p.addresstype}\n` +
                `\tAddress: '${JSON.stringify(addr)}'`
        );
        return def;
    }
}

export function getShortName(p : NominatimPlace) : string | null {
    const addr = p.address;

    const ty = p.addresstype;

    if(NEIGHBORHOOD_LIKE.includes(ty)) {
        return priority(addr, NEIGHBORHOOD_LIKE);
    } else if(ISLAND_LIKE.includes(ty)) {
        return priority(addr, ISLAND_LIKE);
    } else if(CITY_LIKE.includes(ty)) {
        return priority(addr, CITY_LIKE);
    } else if(ty === "county") {
        return addr.county ?? null;
    } else if(STATE_LIKE.includes(ty)) {
        return priority(addr, STATE_LIKE);
    } else if(ty === "country") {
        return country(addr);
    } else {
        console.log(
            `SimpleWeather: unrecognized address type: ${p.addresstype}\n` +
                `\tAddress: '${JSON.stringify(addr)}'`
        );
        return null;
    }
}

