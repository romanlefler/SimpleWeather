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
import Adw from "gi://Adw";

export class GeneralPage extends Adw.PreferencesPage {

    static {
        GObject.registerClass(this);
    }

    constructor(settings : Gio.Settings) {

        super({
            title: "General",
            icon_name: "dialog-information-symbolic"
        });

        const group = new Adw.PreferencesGroup({
            title: "Units",
            description: "Configure units of measurement"
        });
        this.add(group);

        const tempUnits = new Gtk.StringList();
        tempUnits.append("Fahrenheit");
        tempUnits.append("Celsius");
        const tempRow = new Adw.ComboRow({
            title: "Temperature",
            model: tempUnits,
            selected: settings.get_enum("temp-unit") - 1
        });
        tempRow.connect("notify::selected", () => {
            settings.set_enum("temp-unit", tempRow.selected);
        });
        group.add(tempRow);

    }

}
