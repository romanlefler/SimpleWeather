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
import { Location } from "../location.js";
import { gettext as _g } from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js";
import { LibSoup } from "../libsoup.js";
import { Config } from "../config.js";

const SEARCH_BASE = "https://nominatim.openstreetmap.org";
const SEARCH_ENDPOINT = `${SEARCH_BASE}/search`;

interface SelLoc {
    // What to show on the button to clarify results
    buttonName : string;
    // What to name the location if titled (i.e. just the city)
    friendlyName : string;

    lat : number;
    lon : number;
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

    const resultsLocList : SelLoc[] = [ ];
    const stringList = new Gtk.StringList();
    const selModel = new Gtk.SingleSelection({
        can_unselect: false,
        model: stringList
    });
    const resultsView = new Gtk.ListView({
        orientation: Gtk.Orientation.VERTICAL,
        model: selModel,
        factory: setupListFactory(),
        margin_top: 20,
        margin_bottom: 20
    });
    group.add(resultsView);

    const licenseLabel = new Gtk.Label({
        wrap: true,
        wrap_mode: Pango.WrapMode.WORD_CHAR
    });
    group.add(licenseLabel);

    const addBtn = new Gtk.Button({
        label: "Add"
    });
    group.add(addBtn);

    return new Promise<Location | null>((resolve, reject) => {

        searchButton.connect("clicked", () => {
            const a : SearchArgs = {
                search: searchField.text,
                licenseLabel,
                resultsList: stringList,
                soup,
                currentLocNames: cfg.getLocations().map(l => l.getName())
            };
            fetchNominatim(a).then(locArr => {
                const oldLen = resultsLocList.length;
                resultsLocList.splice(0, oldLen, ...locArr);
                populateList(stringList, locArr);
            }).catch(e => {
                if(e instanceof Gio.ResolverError) {
                    console.error(e);
                    showNoInternetDialog(dialog);
                }
                else reject(e);
            });
        });

        addBtn.connect("clicked", () => {
            const item = resultsLocList[selModel.selected];
            if(item) {
                const retLoc = Location.newCoords(item.friendlyName, item.lat, item.lon);
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

function showNoInternetDialog(parent : Gtk.Window) {
    const alert = new Gtk.AlertDialog({
        message: _g("No Internet")
    });
    alert.show(parent);
}

function setupListFactory() : Gtk.SignalListItemFactory {
    const f = new Gtk.SignalListItemFactory();
    f.connect("setup", (_, item : Gtk.ListItem) => {
        const label = new Gtk.Label({
            margin_top: 5,
            margin_bottom: 5
        });
        item.set_child(label);
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

        const name = fixDisplayName(place);
        const lat = parseFloat(place.lat);
        const lon = parseFloat(place.lon);

        let friendlyName = place.address.city ?? place.address.town ?? name;
        // If a duplicate name exists use the longer one
        if(a.currentLocNames.includes(friendlyName)) friendlyName = name;

        list.push({
            buttonName: name,
            friendlyName,
            lat,
            lon
        });
    }
    return list;
}

interface NominatimPlace {
    // British spelling
    licence : string;

    lat : string,
    lon : string,
    addresstype: string;
    name : string;
    display_name : string;
    address : NominatimAddress;
}

interface NominatimAddress {
    town? : string;
    city? : string,
    state? : string,
    country : string,
    country_code : string;
}

function fixDisplayName(p : NominatimPlace) : string {
    const addr = p.address;
    // Fix display names being weird or too long
    switch(p.addresstype) {
        case "city":
            switch (addr.country_code) {
                case "us":
                    // American cities should be City, State, U.S.
                    return `${addr.city}, ${addr.state}, U.S.`;
            }
            break;
        case "town":
            switch(addr.country_code) {
                case "us":
                    // American towns should be Town, State, U.S.
                    return `${addr.town}, ${addr.state}, U.S.`;
            }
            break;
    }

    return p.display_name;
}
