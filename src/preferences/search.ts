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

import Adw from "gi://Adw";
import Gio from "gi://Gio";
import GObject from "gi://GObject";
import Gtk from "gi://Gtk";
import Pango from "gi://Pango";
import { NominatimPlace, getShortName, getDisplayName } from "./placenames.js";
import { Location } from "../location.js";
import { gettext as _g } from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js";
import { LibSoup } from "../libsoup.js";
import { Config, SearchProvider } from "../config.js";
import { isNoInternet } from "../utils.js";
import { MissingQWeatherCredentialsError } from "../errors.js";

const SEARCH_BASE = "https://nominatim.openstreetmap.org";
const SEARCH_ENDPOINT = `${SEARCH_BASE}/search`;
const OPEN_METEO_SEARCH_ENDPOINT = "https://geocoding-api.open-meteo.com/v1/search";

// Must match the nameKey of the QWeather provider
const QWEATHER_KEY = "QWeather";

interface SelLoc {
    // What to show on the button to clarify results
    buttonName : string;
    // What to name the location if titled (i.e. just the city)
    friendlyName : string;

    lat : number;
    lon : number;

    countryCode : string | undefined;
}

interface OpenMeteoPlace {
    name : string;
    latitude : number;
    longitude : number;
    admin1? : string;
    country? : string;
    country_code? : string;
}

export async function searchDialog(parent : Gtk.Window, soup : LibSoup, cfg : Config) : Promise<Location | null> {

    const dialog = new Gtk.Window({
        transient_for: parent,
        title: _g("Search Location"),
        modal: true,
        width_request: parent.get_width() * 0.75,
        height_request: parent.get_height() * 0.75
    });
    const page = new Adw.PreferencesPage();
    const group = new Adw.PreferencesGroup();

    const searchField = new Gtk.Entry({
        placeholder_text: _g("City, Neighborhood, etc.")
    });
    group.add(searchField);

    const searchButton = new Gtk.Button({
        label: _g("Search")
    });
    group.add(searchButton);
    searchField.connect("activate", () => {
        searchButton.emit("clicked");
    })

    const resultsLocList : SelLoc[] = [ ];
    const stringList = new Gtk.StringList();
    const selModel = new Gtk.SingleSelection({
        can_unselect: false,
        model: stringList
    });

    // Added later
    const addBtn = new Gtk.Button({
        label: _g("Add")
    });

    const resultsView = new Gtk.ListView({
        orientation: Gtk.Orientation.VERTICAL,
        model: selModel,
        factory: setupListFactory(addBtn),
        margin_top: 20,
        margin_bottom: 20
    });
    const resultsScroll = new Gtk.ScrolledWindow({
        child: resultsView,
        vexpand: true,
        hexpand: true
    });
    group.add(resultsScroll);

    const licenseLabel = new Gtk.Label({
        wrap: true,
        wrap_mode: Pango.WrapMode.WORD_CHAR,
        css_classes: [ "simpleweather-small", "simpleweather-center" ]
    });
    group.add(licenseLabel);

    group.add(addBtn);

    return new Promise<Location | null>((resolve, reject) => {

        searchButton.connect("clicked", () => {
            searchButton.sensitive = false;
            const a : SearchArgs = {
                search: searchField.text,
                licenseLabel,
                resultsList: stringList,
                soup,
                currentLocNames: cfg.getLocations().map(l => l.getName())
            };
            fetchLocations(a, cfg).then(locArr => {
                const oldLen = resultsLocList.length;
                resultsLocList.splice(0, oldLen, ...locArr);
                populateList(stringList, locArr);
                searchButton.sensitive = true;
            }).catch(e => {
                if(isNoInternet(e)) {
                    console.error(e);
                    showNoInternetDialog(dialog);
                    searchButton.sensitive = true;
                }
                else if(e instanceof MissingQWeatherCredentialsError) {
                    const alert = new Gtk.AlertDialog({
                        message: _g("API Credentials Warning"),
                        detail: e.transl(_g)
                    });
                    alert.show(dialog);
                    searchButton.sensitive = true;
                }
                else reject(e);
            });
        });

        addBtn.connect("clicked", () => {
            const item = resultsLocList[selModel.selected];
            if(item) {
                const countryCode = item.countryCode;
                const retLoc = Location.newCoords(item.friendlyName, item.lat, item.lon, { countryCode });
                resolve(retLoc);
                dialog.close();
            }
        });

        dialog.connect("close-request", () => {
            resolve(null);
        });

        page.add(group);
        dialog.set_child(page);

        dialog.show();
    });

}

interface SearchArgs {
    search : string;
    licenseLabel : Gtk.Label;
    resultsList : Gtk.StringList;
    soup : LibSoup;
    currentLocNames : string[];
}

/**
 * Fetches locations using the configured search provider.
 */
async function fetchLocations(a : SearchArgs, cfg : Config) : Promise<SelLoc[]> {
    const provider = cfg.getSearchProvider();
    switch(provider) {
        case SearchProvider.Nominatim:
            return fetchNominatim(a);
        case SearchProvider.QWeather:
            return fetchQWeather(a, cfg);
        case SearchProvider.OpenMeteo:
            return fetchOpenMeteo(a);
        default:
            throw new Error(`Invalid search provider: ${provider}.`);
    }
}

function showNoInternetDialog(parent : Gtk.Window) {
    const alert = new Gtk.AlertDialog({
        message: _g("No Internet")
    });
    alert.show(parent);
}

function setupListFactory(addBtn : Gtk.Button) : Gtk.SignalListItemFactory {
    const f = new Gtk.SignalListItemFactory();
    f.connect("setup", (_, item : Gtk.ListItem) => {
        const label = new Gtk.Label({
            margin_top: 5,
            margin_bottom: 5
        });
        item.set_child(label);

        const dblClick = new Gtk.GestureClick();
        dblClick.connect("pressed", (_g, nClicks, _x, _y) => {
            if(nClicks === 2) {
                // Double-clicking is same as clicking add
                addBtn.emit("clicked");
            }
        });
        label.add_controller(dblClick);
    });
    f.connect("bind", (_, item : Gtk.ListItem) => {
        const label = item.get_child() as Gtk.Label;
        const val = item.get_item() as GObject.Value;
        label.set_label(val.get_string()!);
    });
    return f;
}

function populateList(resultsList : Gtk.StringList, locs : SelLoc[]) {
    const names = locs.map(l => l.buttonName);
    const oldLen = resultsList.get_n_items();
    resultsList.splice(0, oldLen, names);
}

async function fetchNominatim(a : SearchArgs) : Promise<SelLoc[]> {
    const params = {
        format: "jsonv2",
        addressdetails: "1",
        q: a.search
    };
    const resp = await a.soup.fetchJson(SEARCH_ENDPOINT, params, true);
    if(!resp.is2xx) throw new Error(`Nominatim status code ${resp.status}.`);
    const b = resp.body;

    if(!b[0]) {
        a.licenseLabel.label = _g("No results.");
        return [ ];
    }

    // British spelling of license
    a.licenseLabel.label = b[0]?.licence ?? _g("No copyright information available.");

    const list : SelLoc[] = [ ];
    for(let result of b) {
        const place = result as NominatimPlace;

        const name = getDisplayName(place);
        const lat = parseFloat(place.lat);
        const lon = parseFloat(place.lon);

        let friendlyName = getShortName(place) ?? name;
        // If a duplicate name exists use the longer one
        if(a.currentLocNames.includes(friendlyName)) friendlyName = name;

        list.push({
            buttonName: name,
            friendlyName,
            lat,
            lon,
            countryCode: place.address?.country_code
        });
    }
    return list;
}

async function fetchOpenMeteo(a : SearchArgs) : Promise<SelLoc[]> {
    const params = {
        name: a.search,
        count: "10",
        format: "json"
    };
    const resp = await a.soup.fetchJson(OPEN_METEO_SEARCH_ENDPOINT, params);
    if(!resp.is2xx) {
        throw new Error(
            `Open-Meteo status code ${resp.status}. ` +
            `Reason: ${resp.body?.reason ?? "None Given"}`
        );
    }

    const locs : OpenMeteoPlace[] = resp.body?.results ?? [ ];
    if(!locs[0]) {
        a.licenseLabel.label = _g("No results.");
        return [ ];
    }

    a.licenseLabel.label = "Open-Meteo, GeoNames (CC BY 4.0)";

    const list : SelLoc[] = [ ];
    for(const loc of locs) {
        const displayParts = [ loc.name, loc.admin1, loc.country ]
            .filter((s) : s is string => typeof s === "string" && s.length > 0);
        const display = [ ...new Set(displayParts) ].join(", ");

        let friendlyName = loc.name;
        if(a.currentLocNames.includes(friendlyName)) friendlyName = display;

        list.push({
            buttonName: display,
            friendlyName,
            lat: loc.latitude,
            lon: loc.longitude,
            countryCode: loc.country_code
        });
    }
    return list;
}

async function fetchQWeather(a : SearchArgs, cfg : Config) : Promise<SelLoc[]> {
    const hostIn = cfg.getApiHosts().get(QWEATHER_KEY);
    const key = cfg.getApiKeys().get(QWEATHER_KEY);
    if(!hostIn || !key) throw new MissingQWeatherCredentialsError();

    // Strip the scheme and trailing slashes
    const host = hostIn.replace(/^https?:\/\//, "").replace(/\/+$/, "");
    const params = {
        location: a.search,
        number: "10"
    };
    const resp = await a.soup.fetchJson(
        `https://${host}/geo/v2/city/lookup`, params, false,
        { "X-QW-Api-Key": key }
    );
    if(!resp.is2xx) throw new Error(`QWeather status code ${resp.status}.`);
    const b = resp.body;
    if(b.code !== "200") throw new Error(`QWeather gave error code ${b.code}.`);

    const locs : any[] = b.location ?? [ ];
    if(!locs[0]) {
        a.licenseLabel.label = _g("No results.");
        return [ ];
    }

    const refer = b.refer;
    const licenseParts : string[] = [ ...refer?.license ?? [ ], ...refer?.sources ?? [ ] ];
    a.licenseLabel.label = licenseParts.length > 0
        ? licenseParts.join(", ")
        : _g("No copyright information available.");

    const list : SelLoc[] = [ ];
    for(let loc of locs) {
        // e.g. "Dongcheng, Beijing City, China"
        const display = [ loc.name, loc.adm1, loc.country ]
            .filter((s : any) => typeof s === "string" && s.length > 0)
            .join(", ");

        let friendlyName = loc.name;
        // If a duplicate name exists use the longer one
        if(a.currentLocNames.includes(friendlyName)) friendlyName = display;

        list.push({
            buttonName: display,
            friendlyName,
            lat: parseFloat(loc.lat),
            lon: parseFloat(loc.lon),
            // QWeather does not return a country code
            countryCode: undefined
        });
    }
    return list;
}
