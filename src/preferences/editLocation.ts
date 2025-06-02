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
import Gtk from "gi://Gtk";
import GLib from "gi://GLib";
import { Location } from "../location.js";

export async function editLocation(parent : Gtk.Window, loc? : Location) : Promise<Location | null> {
    const dialog = new Gtk.Window({
        transient_for: parent,
        title: loc ? "Edit %s".format(loc.getName()) : "New Location",
        modal: true,
    });
    const page = new Adw.PreferencesPage();
    const group = new Adw.PreferencesGroup();
    const nameRow = new Adw.EntryRow({
        title: "Name",
        text: loc?.getRawName() ?? ""
    });

    // TODO: There should be a radio with Here vs. Coords
    // TODO: More localized coordinates; right now positive/negative with space separator is adequate
    // (see https://i18n.leifgehrmann.com/geo-coordinates/)
    let coordsText;
    if(!loc) coordsText = "40.7 -73.97";
    else if(loc.isHere()) coordsText = "here";
    else coordsText = `${loc.lat} ${loc.lon}`;
    const coordsRow = new Adw.EntryRow({
        title: "Coordinates",
        text: coordsText
    });

    group.add(nameRow);
    group.add(coordsRow);

    const save = new Gtk.Button({
        child: new Adw.ButtonContent({
            icon_name: "document-save-symbolic",
            label: "Save"
        }),
        css_classes: [ "suggested-action" ]
    });
    dialog.set_titlebar(save);

    const prom = new Promise<Location | null>((resolve, reject) => {
        save.connect("clicked", () => {
            // TODO
            resolve(Location.newHere());
        });
        dialog.connect("close-request", () => {
            dialog.destroy();
            resolve(null);
        });
    });

    dialog.show();
    return prom;
}
