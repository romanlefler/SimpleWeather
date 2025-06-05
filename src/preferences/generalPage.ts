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
            icon_name: "preferences-system-symbolic"
        });

        const unitGroup = new Adw.PreferencesGroup({
            title: "Units",
            description: "Configure units of measurement"
        });

        const tempUnits = new Gtk.StringList();
        tempUnits.append("Fahrenheit");
        tempUnits.append("Celsius");
        const tempRow = new Adw.ComboRow({
            title: "Temperature",
            model: tempUnits,
            selected: settings.get_enum("temp-unit") - 1
        });
        tempRow.connect("notify::selected", () => {
            settings.set_enum("temp-unit", tempRow.selected + 1);
            settings.apply();
        });
        unitGroup.add(tempRow);

        this.add(unitGroup);

        const myLocGroup = new Adw.PreferencesGroup({
            title: "My Location",
            description: "Configure how your location is found"
        });

        const myLocProvs = new Gtk.StringList();
        myLocProvs.append("Online - IPinfo");
        myLocProvs.append("System - Geoclue");
        myLocProvs.append("Disable");
        const myLocRow = new Adw.ComboRow({
            title: "Provider",
            model: myLocProvs,
            selected: settings.get_enum("my-loc-provider") - 1
        });
        myLocRow.connect("notify::selected", () => {
            settings.set_enum("my-loc-provider", myLocRow.selected + 1);
            settings.apply();
        });
        myLocGroup.add(myLocRow);

        const myLocRefresh = new Adw.SpinRow({
            title: "Refresh Interval (Minutes)",
            adjustment: new Gtk.Adjustment({
                lower: 10.0,
                upper: 10000,
                step_increment: 5.0,
                page_increment: 30.0,
                value: settings.get_double("my-loc-refresh-min")
            }),
        });
        myLocRefresh.connect("notify::value", () => {
            settings.set_double("my-loc-refresh-min", myLocRefresh.value);
            settings.apply();
        });
        myLocGroup.add(myLocRefresh);

        this.add(myLocGroup);

    }

}
