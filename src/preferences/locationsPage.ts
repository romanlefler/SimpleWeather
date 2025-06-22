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
import { gettext as _g } from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js";
import { searchDialog } from "./search.js";

const ICON_SELECTED = "radio-checked-symbolic";
const ICON_NOT_SELECTED = "radio-symbolic";

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

    #moveUp : Gtk.Button;
    #moveDown : Gtk.Button;

    // When locations is changed, this will tick up.
    // Useful for seeing if it's changed.
    #changeTracker : number;

    constructor(settings : Gio.Settings, window : Adw.PreferencesWindow) {

        super({
            title: _g("Locations"),
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
                label: _g("Add")
            })
        });
        addButton.connect("clicked", () => {
            this.#addLoc().catch(e => {
                console.error(e);
                this.#toastError(e);
            });
        });
        this.#locGroup = new Adw.PreferencesGroup({
            title: _g("Locations"),
            header_suffix: addButton
        });
        this.add(this.#locGroup);

        this.#config.onLocationsChanged(() => {
            this.#changeTracker++;
            this.#guiRefreshList();
        });
        this.#config.onMainLocationIndexChanged(this.#guiRefreshChecks.bind(this));

        const bottomBox = new Gtk.Box({
            orientation: Gtk.Orientation.HORIZONTAL,
            margin_top: 10
        });
        this.#moveUp = new Gtk.Button({
            child: new Adw.ButtonContent({
                label: _g("Move Up"),
                icon_name: "arrow-up"
            }),
            hexpand: true,
            margin_end: 2,
            sensitive: false
        });
        this.#moveUp.connect("clicked", () => {
            const index = this.#config.getMainLocationIndex();
            if(index === 0) return;
            this.#moveLocs(index, false);
        });
        bottomBox.append(this.#moveUp);
        this.#moveDown = new Gtk.Button({
            child: new Adw.ButtonContent({
                label: _g("Move Down"),
                icon_name: "arrow-down"
            }),
            hexpand: true,
            margin_start: 2,
            margin_end: 2,
            sensitive: false
        });
        this.#moveDown.connect("clicked", () => {
            const index = this.#config.getMainLocationIndex();
            if(index === this.#locRows.length - 1) return;
            this.#moveLocs(index, true);
        });
        bottomBox.append(this.#moveDown);
        const addMyLocBtn = new Gtk.Button({
            child: new Adw.ButtonContent({
                label: _g("Add Here"),
                icon_name: "list-add-symbolic"
            }),
            hexpand: true,
            margin_start: 2
        });
        addMyLocBtn.connect("clicked", () => {
            this.#appendLocObj(Location.newHere());
        });
        bottomBox.append(addMyLocBtn);
        this.#locGroup.add(bottomBox);

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
            const name = l.getName();
            const row = new Adw.ActionRow({
                title: name,
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
                this.#editLoc(l, permIndex).catch(e => {
                    console.error(e);
                    this.#toastError(e);
                });
            });
            const deleteBtn = new Gtk.Button({
                icon_name: "edit-delete-symbolic",
                valign: Gtk.Align.CENTER,
                css_classes: [ "destructive-action" ]
            });
            deleteBtn.connect("clicked", () => {
                const alert = new Gtk.AlertDialog({
                    message: _g("Are you sure you want delete %s?").format(name),
                    buttons: [ _g("Cancel"), _g("Delete") ],
                    cancel_button: 0,
                    default_button: 1
                });
                alert.choose(this.#window, null, (_, result) => {
                    const inx = alert.choose_finish(result);
                    if(inx === 1) this.#deleteLoc(locs, permIndex);
                });
            });
            box.append(editBtn);
            box.append(deleteBtn);
            row.add_suffix(box);
            this.#locGroup.add(row);
            this.#locRows.push(row);
        }
        this.#updateMoveButtons(inx);
    }

    #guiRefreshChecks() {
        const inx = this.#config.getMainLocationIndex();
        for(let i = 0; i < this.#locRows.length; i++) {

            this.#locRows[i].set_icon_name(
                i === inx ? ICON_SELECTED : ICON_NOT_SELECTED
            );

        }
        this.#updateMoveButtons(inx);
    }

    #updateMoveButtons(mainLocationIndex : number) {
        this.#moveUp.sensitive = mainLocationIndex !== 0;
        this.#moveDown.sensitive = mainLocationIndex !== this.#locRows.length - 1;
    }

    #toast(s : string) {
        const toast = new Adw.Toast({ title: s });
        this.#window.add_toast(toast);
    }

    #toastError(e : any) {
        if(e instanceof Error) this.#toast(_g("Internal Error: %s").format(e.name));
        else this.#toast(_g("Internal Error"));
    }

    async #editLoc(loc : Location | null, index : number) {
        // This lets us know if the locations list has changed
        const onTracker = this.#changeTracker;

        let newLoc;
        try {
            newLoc = await editLocation(this.#window, loc ?? undefined);
        }
        catch(e) {
            if(e instanceof UserInputError) {
                this.#toast(e.message);
                return;
            }

            console.error(e);
            this.#toastError(e);
            return;
        }

        if(!newLoc) return;
        // If locations changed then we don't know the state of anything
        if(onTracker !== this.#changeTracker) {
            this.#toast(_g("Something else edited the locations."));
            return;
        }

        const locsArray = this.#config.getLocations();
        if(loc) locsArray[index] = newLoc;
        else locsArray.push(newLoc);

        const strArray = locsArray.map(k => k.toString());
        const gVariant = writeGTypeAS(strArray);
        this.#settings.set_value("locations", gVariant);
        this.#settings.apply();
    }

    async #addLoc() {

        let newLoc;
        try {
            newLoc = await searchDialog(this.#window, this.#libSoup, this.#config);
        }
        catch(e) {
            console.error(e);
            this.#toastError(e);
            return;
        }

        if(!newLoc) return;
        
        this.#appendLocObj(newLoc);
    }

    #appendLocObj(newLoc : Location) {
        const locsArray = this.#config.getLocations();
        const newIndex = locsArray.length;
        locsArray.push(newLoc);

        const strArray = locsArray.map(k => k.toString());
        const gVariant = writeGTypeAS(strArray);
        this.#settings.set_value("locations", gVariant);
        this.#settings.set_int64("main-location-index", newIndex);
        this.#settings.apply();
    }

    #moveLocs(oldIndex : number, down : boolean) {
        const locsArray = this.#config.getLocations();
        const item = locsArray.splice(oldIndex, 1)[0];
        if(down) locsArray.splice(oldIndex + 1, 0, item);
        else locsArray.splice(oldIndex - 1, 0, item);

        const strArray = locsArray.map(k => k.toString());
        const gVariant = writeGTypeAS(strArray);
        this.#settings.set_value("locations", gVariant);
        this.#settings.set_int64("main-location-index", down ? oldIndex + 1 : oldIndex - 1);
        this.#settings.apply();
    }

    #deleteLoc(locs : Location[], index : number) {
        locs.splice(index, 1);
        const strArray = locs.map(k => k.toString());
        const gVariant = writeGTypeAS(strArray);
        this.#settings.set_value("locations", gVariant);

        const cur = this.#config.getMainLocationIndex();
        const len = Math.max(1, locs.length);
        if(cur > len) this.#settings.set_int64("main-location-index", len - 1);
        else if(cur === len) this.#settings.set_int64("main-location-index", 0);

        this.#settings.apply();
    }

}

