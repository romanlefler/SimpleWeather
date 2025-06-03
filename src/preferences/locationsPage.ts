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

import GObject from "gi://GObject";
import Gtk from "gi://Gtk";
import Gio from "gi://Gio";
import GLib from "gi://GLib";
import Adw from "gi://Adw";
import { LibSoup } from "../libsoup.js";
import { Config, writeGTypeAS } from "../config.js";
import { editLocation } from "./editLocation.js";
import { Location } from "../location.js";
import { UserInputError } from "../errors.js";

const ICON_SELECTED = "radio-checked-symbolic";
const ICON_NOT_SELECTED = "radio-checked-symbolic";

export class LocationsPage extends Adw.PreferencesPage {

    static {
        GObject.registerClass(this);
    }

    #window : Adw.PreferencesWindow;
    #settings : Gio.Settings;
    #config : Config;
    #libSoup : LibSoup;
    #locGroup : Adw.PreferencesGroup;
    #locRows : Adw.ActionRow[];

    // When locations is changed, this will tick up.
    // Useful for seeing if it's changed.
    #changeTracker : number;

    constructor(settings : Gio.Settings, window : Adw.PreferencesWindow) {

        super({
            title: "Locations",
            icon_name: "find-location-symbolic"
        });
        this.#changeTracker = 0;
        this.#window = window;
        this.#settings = settings;
        this.#config = new Config(settings);
        this.#libSoup = new LibSoup();
        this.#locRows = [ ];

        const addButton = new Gtk.Button({
            child: new Adw.ButtonContent({
                icon_name: "list-add-symbolic",
                label: "Add"
            })
        });
        this.#locGroup = new Adw.PreferencesGroup({
            title: "Locations",
            header_suffix: addButton
        });
        this.add(this.#locGroup);

        this.#config.onLocationsChanged(() => {
            this.#changeTracker++;
            this.#guiRefreshList();
        });
        this.#config.onMainLocationIndexChanged(this.#guiRefreshChecks.bind(this));

        this.#guiRefreshList();
    }

    #guiRemoveAll() {
        while(this.#locRows.length > 0) {
            const row = this.#locRows.pop()!;
            this.#locGroup.remove(row);
        }
    }

    #guiRefreshList() {
        this.#guiRemoveAll();

        const inx = this.#config.getMainLocationIndex();
        const locs = this.#config.getLocations();
        for(let i = 0; i < locs.length; i++) {
            const l = locs[i];
            const row = new Adw.ActionRow({
                title: l.getName(),
                subtitle: l.getDescription(),
                activatable: true,
                icon_name: i === inx ? ICON_SELECTED : ICON_NOT_SELECTED
            });
            const permIndex = i;
            row.connect("activated", () => {
                if(permIndex === this.#config.getMainLocationIndex()) return;
                this.#settings.set_int64("main-location-index", permIndex);
                this.#settings.apply();
            });
            const box = new Gtk.Box({
                orientation: Gtk.Orientation.HORIZONTAL,
                halign: Gtk.Align.CENTER,
                hexpand: false,
                vexpand: false
            });
            const editBtn = new Gtk.Button({
                icon_name: "document-edit-symbolic",
                valign: Gtk.Align.CENTER
            });
            editBtn.connect("clicked", () => {
                this.#editLoc(l, permIndex).catch(console.error);
            });
            const deleteBtn = new Gtk.Button({
                icon_name: "edit-delete-symbolic",
                valign: Gtk.Align.CENTER
            });
            deleteBtn.connect("clicked", this.#deleteLoc.bind(this, locs, permIndex));
            box.append(editBtn);
            box.append(deleteBtn);
            row.add_suffix(box);
            this.#locGroup.add(row);
            this.#locRows.push(row);
        }
    }

    #guiRefreshChecks() {
        const inx = this.#config.getMainLocationIndex();
        for(let i = 0; i < this.#locRows.length; i++) {

            this.#locRows[i].set_icon_name(
                i === inx ? ICON_SELECTED : ICON_NOT_SELECTED
            );

        }
    }

    #toast(s : string) {
        const toast = new Adw.Toast({ title: s });
        this.#window.add_toast(toast);
    }

    async #editLoc(loc : Location, index : number) {
        // This lets us know if the locations list has changed
        const onTracker = this.#changeTracker;

        let newLoc;
        try {
            newLoc = await editLocation(this.#window, loc);
        }
        catch(e) {
            if(e instanceof UserInputError) {
                this.#toast(e.message);
                return;
            }

            console.error(e);
            this.#toast("Internal Error");
            return;
        }

        if(!newLoc) return;
        // If locations changed then we don't know the state of anything
        if(onTracker !== this.#changeTracker) {
            this.#toast("Something else edited the locations.");
            return;
        }

        const locsArray = this.#config.getLocations();
        locsArray[index] = newLoc;
        const strArray = locsArray.map(k => k.toString());
        const gVariant = writeGTypeAS(strArray);
        this.#settings.set_value("locations", gVariant);
        this.#settings.apply();
    }

    #deleteLoc(locs : Location[], index : number) {
        locs.splice(index, 1);
        const strArray = locs.map(k => k.toString());
        const gVariant = writeGTypeAS(strArray);
        this.#settings.set_value("locations", gVariant);

        const cur = this.#config.getMainLocationIndex();
        const len = Math.max(1, locs.length);
        if(cur >= len) this.#settings.set_int64("main-location-index", len - 1);

        this.#settings.apply();
    }

}

