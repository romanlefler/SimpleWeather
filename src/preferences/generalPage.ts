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
import { gettext as _g } from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js";
import { WeatherProviderNames } from "../providers/provider.js";

function setVisibilites(value : boolean, ...widgets : Gtk.Widget[]) {
    for(let w of widgets) w.visible = value;
}

export class GeneralPage extends Adw.PreferencesPage {

    static {
        GObject.registerClass(this);
    }

    constructor(settings : Gio.Settings) {

        super({
            title: _g("General"),
            icon_name: "preferences-system-symbolic"
        });

        const unitGroup = new Adw.PreferencesGroup({
            title: _g("Units"),
            description: _g("Configure units of measurement")
        });

        const unitPresetUnits = new Gtk.StringList({ strings: [
            _g("US"), _g("UK"), _g("Metric"), _g("Custom")
        ]});
        const unitPresetFromEnumMap = [ 3, 0, 1, 2 ];
        const curUnitPreset = settings.get_enum("unit-preset");
        const unitPresetRow = new Adw.ComboRow({
            title: _g("Units"),
            model: unitPresetUnits,
            selected: unitPresetFromEnumMap[curUnitPreset]
        });
        // Connecting on this one is done later
        unitGroup.add(unitPresetRow);

        const tempUnits = new Gtk.StringList();
        tempUnits.append(_g("Fahrenheit"));
        tempUnits.append(_g("Celsius"));
        const tempRow = new Adw.ComboRow({
            title: _g("Temperature"),
            model: tempUnits,
            selected: settings.get_enum("temp-unit") - 1,
        });
        tempRow.connect("notify::selected", () => {
            settings.set_enum("temp-unit", tempRow.selected + 1);
            settings.apply();
        });
        unitGroup.add(tempRow);

        const speedUnits = new Gtk.StringList({ strings: [
            "mph", "m/s", "km/h", "Knots", "ft/s", "Beaufort"
        ]});
        const speedRow = new Adw.ComboRow({
            title: _g("Speed"),
            model: speedUnits,
            selected: settings.get_enum("speed-unit") - 1
        });
        speedRow.connect("notify::selected", () => {
            settings.set_enum("speed-unit", speedRow.selected + 1);
            settings.apply();
        });
        unitGroup.add(speedRow);

        const pressureUnits = new Gtk.StringList({ strings: [
            "inHg", "hPa", "mmHg"
        ]});
        const pressureRow = new Adw.ComboRow({
            title: _g("Pressure"),
            model: pressureUnits,
            selected: settings.get_enum("pressure-unit") - 1
        });
        pressureRow.connect("notify::selected", () => {
            settings.set_enum("pressure-unit", pressureRow.selected + 1);
            settings.apply();
        });
        unitGroup.add(pressureRow);

        const rainMeasurementUnits = new Gtk.StringList({ strings: [
            "in", "mm", "cm", "pts"
        ]});
        const rainMeasurementRow = new Adw.ComboRow({
            title: _g("Rain Measurement"),
            model: rainMeasurementUnits,
            selected: settings.get_enum("rain-measurement-unit") - 1
        });
        rainMeasurementRow.connect("notify::selected", () => {
            settings.set_enum("rain-measurement-unit", rainMeasurementRow.selected + 1);
            settings.apply();
        });
        unitGroup.add(rainMeasurementRow);

        const distanceUnits = new Gtk.StringList({ strings: [
            "mi", "km", "ft", "m"
        ]});
        const distanceRow = new Adw.ComboRow({
            title: _g("Distance"),
            model: distanceUnits,
            selected: settings.get_enum("distance-unit") - 1
        });
        distanceRow.connect("notify::selected", () => {
            settings.set_enum("distance-unit", distanceRow.selected + 1);
            settings.apply();
        });
        unitGroup.add(distanceRow);

        // If unit preset is not custom, most unit rows shouldn't be shown
        setVisibilites(curUnitPreset === 0, tempRow, speedRow, pressureRow,
            rainMeasurementRow, distanceRow);
        unitPresetRow.connect("notify::selected", () => {
            const toEnumMap = [ 1, 2, 3, 0 ];
            const val = toEnumMap[unitPresetRow.selected];
            setVisibilites(val === 0, tempRow, speedRow, pressureRow,
                rainMeasurementRow, distanceRow);

            settings.set_enum("unit-preset", val);
            settings.apply();
        });

        const directionUnits = new Gtk.StringList({ strings: [
            _g("Degrees"), _g("Eight-Point Compass")
        ]});
        const directionRow = new Adw.ComboRow({
            title: _g("Direction"),
            model: directionUnits,
            selected: settings.get_enum("direction-unit") - 1
        });
        directionRow.connect("notify::selected", () => {
            settings.set_enum("direction-unit", directionRow.selected + 1);
            settings.apply();
        });
        unitGroup.add(directionRow);
        this.add(unitGroup);

        const weatherServiceGroup = new Adw.PreferencesGroup({
            title: _g("Weather Service"),
            description: _g("Configure how the weather is attained")
        });

        const wProvList = new Gtk.StringList({
            strings: WeatherProviderNames as string[]
        });
        const wProvRow = new Adw.ComboRow({
            title: _g("Weather Provider"),
            model: wProvList,
            selected: settings.get_enum("weather-provider") - 1
        });
        wProvRow.connect("notify::selected", () => {
            settings.set_enum("weather-provider", wProvRow.selected + 1);
            settings.apply();
        });
        weatherServiceGroup.add(wProvRow);
        this.add(weatherServiceGroup);

        const myLocGroup = new Adw.PreferencesGroup({
            title: _g("My Location"),
            description: _g("Configure how your location is found")
        });

        const myLocProvs = new Gtk.StringList();
        myLocProvs.append(`${_g("Online")} - IPinfo`);
        myLocProvs.append(`${_g("System")} - Geoclue`);
        myLocProvs.append(_g("Disable"));
        const myLocRow = new Adw.ComboRow({
            title: _g("Provider"),
            model: myLocProvs,
            selected: settings.get_enum("my-loc-provider") - 1
        });
        myLocRow.connect("notify::selected", () => {
            settings.set_enum("my-loc-provider", myLocRow.selected + 1);
            settings.apply();
        });
        myLocGroup.add(myLocRow);

        const myLocRefresh = new Adw.SpinRow({
            title: _g("Refresh Interval (Minutes)"),
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

        const a11yGroup = new Adw.PreferencesGroup({
            title: _g("Accessibility"),
            description: _g("Configure accessibility features")
        });
        const hiContrastRow = new Adw.SwitchRow({
            title: _g("High Contrast"),
            active: settings.get_boolean("high-contrast")
        });
        hiContrastRow.connect("notify::active", () => {
            settings.set_boolean("high-contrast", hiContrastRow.active);
            settings.apply();
        });
        a11yGroup.add(hiContrastRow);
        this.add(a11yGroup);
    }

}
