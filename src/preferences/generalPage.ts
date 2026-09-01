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
import {
    WeatherProviderApiKeys,
    WeatherProviderKeys,
    provRequiresKey,
    provRequiresHost
} from "../providers/provider.js";
import { readGTypeABSS, writeGTypeABSS } from "../config.js";
import { LibSoup } from "../libsoup.js";
import { isNoInternet } from "../utils.js";

function setVisibilites(value : boolean, ...widgets : Gtk.Widget[]) {
    for(let w of widgets) w.visible = value;
}

function normalizeApiHost(host : string) : string {
    return host.trim().replace(/^https?:\/\//i, "").replace(/\/+$/, "");
}

export class GeneralPage extends Adw.PreferencesPage {

    static {
        GObject.registerClass(this);
    }

    #window : Adw.PreferencesWindow;

    constructor(settings : Gio.Settings, window : Adw.PreferencesWindow) {

        super({
            title: _g("General"),
            icon_name: "preferences-system-symbolic"
        });
        this.#window = window;

        const unitGroup = new Adw.PreferencesGroup({
            title: _g("Units"),
            description: _g("Configure units of measurement")
        });

        const unitPresetUnits = new Gtk.StringList({ strings: [
            _g("US"), _g("UK"), _g("Metric"), _g("Nordic"), _g("Custom")
        ]});
        const unitPresetFromEnumMap = [ 4, 0, 1, 2, 3 ];
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

        // This line automatically reverses the mapping from enum to menu
        const unitPresetInverse = unitPresetFromEnumMap.reduce<number[]>(
            (out, v, i) => (out[v] = i, out), []
        );
        unitPresetRow.connect("notify::selected", () => {
            const val = unitPresetInverse[unitPresetRow.selected];
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
            // Add an asterisk to paid providers
            strings: WeatherProviderKeys.map((s, i) => provRequiresKey(i) ? s + "*" : s)
        });
        const currentWProv = settings.get_enum("weather-provider") - 1
        const wProvRow = new Adw.ComboRow({
            title: _g("Weather Provider"),
            model: wProvList,
            selected: currentWProv
        });
        weatherServiceGroup.add(wProvRow);

        const weatherProviderNotes = [
            _g("The open-source, most privacy-friendly default."),
            _g("Requires an account with a One Call 3.0 subscription."),
            _g("Recommended primarily for users in mainland China. Requires an account.")
        ];
        const weatherProviderNote = new Gtk.Label({
            label: weatherProviderNotes[currentWProv] ?? "",
            wrap: true,
            xalign: 0,
            css_classes: [ "simpleweather-small", "simpleweather-margin-wide" ]
        });
        weatherServiceGroup.add(weatherProviderNote);

        const currentKeyNeeded = provRequiresKey(currentWProv);
        const currentApiKey = this.#getApiKey(settings, currentWProv);
        const apiKeyRow = new Adw.EntryRow({
            title: currentKeyNeeded ? _g("API Key (Required)") : _g("API Key"),
            visible: currentKeyNeeded,
            text: currentApiKey,
            showApplyButton: true
        });
        weatherServiceGroup.add(apiKeyRow);

        const currentHostNeeded = provRequiresHost(currentWProv);
        const currentApiHost = this.#getApiHost(settings, currentWProv);
        const apiHostRow = new Adw.EntryRow({
            title: currentHostNeeded ? _g("API Host (Required)") : _g("API Host"),
            visible: currentHostNeeded,
            text: currentApiHost,
            showApplyButton: true
        });
        weatherServiceGroup.add(apiHostRow);

        const isQWeatherSelected = () =>
            WeatherProviderApiKeys[wProvRow.selected] === "QWeather";
        const validateCredentialsRow = new Adw.ButtonRow({
            title: _g("Validate Credentials"),
            visible: isQWeatherSelected()
        });
        weatherServiceGroup.add(validateCredentialsRow);

        const updateValidateCredentialsRow = () => {
            const i = wProvRow.selected;
            validateCredentialsRow.visible = isQWeatherSelected();
            validateCredentialsRow.sensitive =
                apiKeyRow.text.trim() === this.#getApiKey(settings, i) &&
                normalizeApiHost(apiHostRow.text) ===
                    normalizeApiHost(this.#getApiHost(settings, i));
        };

        apiKeyRow.connect("changed", updateValidateCredentialsRow);
        apiHostRow.connect("changed", updateValidateCredentialsRow);
        apiKeyRow.connect("apply", () => {
            this.#setApiKey(settings, apiKeyRow, wProvRow);
            updateValidateCredentialsRow();
        });
        apiHostRow.connect("apply", () => {
            this.#setApiHost(settings, apiHostRow, wProvRow);
            updateValidateCredentialsRow();
        });

        validateCredentialsRow.connect("activated", () => {
            const i = wProvRow.selected;
            const key = this.#getApiKey(settings, i);
            const host = this.#getApiHost(settings, i);
            this.#validateQWeatherCreds(key, host).then(msg => {
                if(msg !== null) {
                    const alert = new Gtk.AlertDialog({
                        message: _g("API Credentials Warning"),
                        detail: msg
                    });
                    alert.show(this.#window);
                }
            });
        });

        wProvRow.connect("notify::selected", () => {
            const i = wProvRow.selected;

            settings.set_enum("weather-provider", i + 1);
            settings.apply();
            weatherProviderNote.label = weatherProviderNotes[i] ?? "";

            const keyNeeded = provRequiresKey(i);
            apiKeyRow.title = keyNeeded ? _g("API Key (Required)") : _g("API Key");
            apiKeyRow.visible = keyNeeded;
            apiKeyRow.text = this.#getApiKey(settings, i);

            const hostNeeded = provRequiresHost(i);
            apiHostRow.title = hostNeeded ? _g("API Host (Required)") : _g("API Host");
            apiHostRow.visible = hostNeeded;
            apiHostRow.text = this.#getApiHost(settings, i);

            updateValidateCredentialsRow();
        });
        updateValidateCredentialsRow();

        this.add(weatherServiceGroup);

        const myLocGroup = new Adw.PreferencesGroup({
            title: _g("My Location"),
            description: _g("Configure how your location is found")
        });

        const myLocProvs = new Gtk.StringList();
        myLocProvs.append(`${_g("Online")} - ipapi.co`);
        myLocProvs.append(`${_g("Online")} - IPinfo`);
        myLocProvs.append(`${_g("Online")} - ip.sb`);
        myLocProvs.append(`${_g("System")} - Geoclue`);
        myLocProvs.append(_g("Disable"));
        const myLocProvFromEnum = [ 0x0, 1, 3, 4, 0, 2 ];
        const myLocRow = new Adw.ComboRow({
            title: _g("Provider"),
            model: myLocProvs,
            selected: myLocProvFromEnum[settings.get_enum("my-loc-provider")]
        });
        myLocRow.connect("notify::selected", () => {
            const myLocProvToEnum = [ 4, 1, 5, 2, 3 ];
            settings.set_enum("my-loc-provider", myLocProvToEnum[myLocRow.selected]);
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
            })
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

        const panelGroup = new Adw.PreferencesGroup({
            title: _g("Panel"),
            description: _g("Configure the panel")
        });

        const panelBoxModel = new Gtk.StringList({ strings: [
            _g("Right"), _g("Center"), _g("Left")
        ]});
        const panelBoxRow = new Adw.ComboRow({
            title: _g("Side of Panel"),
            model: panelBoxModel,
            selected: settings.get_enum("panel-box")
        });
        panelBoxRow.connect("notify::selected", () => {
            settings.set_enum("panel-box", panelBoxRow.selected);
            // Auto-adjust panel offset based on panel position
            const offsetValues = [0, 50, 100];
            settings.set_double("panel-offset", offsetValues[panelBoxRow.selected]);
            settings.apply();
        });
        panelGroup.add(panelBoxRow);
        const panelPriorityRow = new Adw.SpinRow({
            title: _g("Order in Panel"),
            adjustment: new Gtk.Adjustment({
                lower: -10000,
                upper: 10000,
                step_increment: 1,
                page_increment: 3,
                value: settings.get_int64("panel-priority")
            })
        });
        panelPriorityRow.connect("notify::value", () => {
            const int64 = Math.round(panelPriorityRow.value);
            settings.set_int64("panel-priority", int64);
            settings.apply();
        });
        panelGroup.add(panelPriorityRow);

        const panelOffsetRow = new Adw.ActionRow({
            title: _g("Pop-Up Offset"),
            subtitle: _g("Horizontal pop-up offset from 0–100.")
        });
        const OFFSET_STEP = 5;
        const panelOffsetScale = new Gtk.Scale({
            orientation: Gtk.Orientation.HORIZONTAL,
            adjustment: new Gtk.Adjustment({
                lower: -100.0,
                upper: 0.0,
                step_increment: 5.0,
                page_increment: 10.0,
                value: settings.get_double("panel-offset")
            }),
            digits: 0,
            round_digits: OFFSET_STEP,
            draw_value: true, // show the number bubble/value
            hexpand: true
        });
        for(const i of [ 0, -50, -100 ]) {
            panelOffsetScale.add_mark(i, Gtk.PositionType.BOTTOM, null);
        }

        panelOffsetRow.add_suffix(panelOffsetScale);
        panelOffsetRow.set_activatable_widget(panelOffsetScale);
        panelOffsetScale.adjustment.connect("notify::value", a => {
            if(a.value % OFFSET_STEP !== 0) {
                a.value = Math.round(a.value / OFFSET_STEP) * OFFSET_STEP;
            }
            settings.set_double("panel-offset", -a.value);
            settings.apply();
        });
        // Update UI when offset is changed by panel position setting
        settings.connect("changed", (_, key) => {
            if(key === "panel-offset") {
                const v = settings.get_double("panel-offset");
                panelOffsetScale.adjustment.value = -v;
            }
        });
        panelGroup.add(panelOffsetRow);

        const useSymbolicRow = new Adw.SwitchRow({
            title: _g("Use Symbolic Icons in Panel"),
            active: settings.get_boolean("symbolic-icons-panel")
        });
        useSymbolicRow.connect("notify::active", () => {
            const val = useSymbolicRow.active;
            settings.set_boolean("symbolic-icons-panel", val);
            settings.apply();
        });
        panelGroup.add(useSymbolicRow);
        const alwaysPackagedRow = new Adw.SwitchRow({
            title: _g("Always Use Packaged Icons"),
            active: settings.get_boolean("always-packaged-icons")
        });
        alwaysPackagedRow.connect("notify::active", () => {
            const val = alwaysPackagedRow.active;
            settings.set_boolean("always-packaged-icons", val);
            settings.apply();
        });
        panelGroup.add(alwaysPackagedRow);

        const showRefreshButton = new Adw.SwitchRow({
            title: _g("Show Refresh Button"),
            active: settings.get_boolean("show-refresh-button")
        });
        showRefreshButton.connect("notify::active", w => {
            const val = w.active;
            settings.set_boolean("show-refresh-button", val);
            settings.apply();
        });
        panelGroup.add(showRefreshButton);

        const hideErrPopupRow = new Adw.SwitchRow({
            title: _g("Hide Error Popup"),
            subtitle: _g("If the popup just says Error, don't even show it."),
            active: settings.get_boolean("hide-err-popup")
        });
        hideErrPopupRow.connect("notify::active", w => {
            const val = w.active;
            settings.set_boolean("hide-err-popup", val);
            settings.apply();
        });
        panelGroup.add(hideErrPopupRow);

        this.add(panelGroup);
    }

    #getApiKey(settings : Gio.Settings, providerIndex : number) : string {
        const map = readGTypeABSS(settings.get_value("api-keys"));
        const key = WeatherProviderApiKeys[providerIndex];
        return map.get(key) ?? "";
    }

    #getApiHost(settings : Gio.Settings, providerIndex : number) : string {
        const map = readGTypeABSS(settings.get_value("api-hosts"));
        const key = WeatherProviderApiKeys[providerIndex];
        return map.get(key) ?? "";
    }

    #setApiKey(settings : Gio.Settings, apiKeyRow : Adw.EntryRow, wProvRow : Adw.ComboRow) {
        const v = apiKeyRow.text.trim();
        const i = wProvRow.selected;
        const k = WeatherProviderApiKeys[i];

        const map = readGTypeABSS(settings.get_value("api-keys"));
        if(v.length > 0) map.set(k, v);
        else map.delete(k);

        const gtype = writeGTypeABSS(map);
        settings.set_value("api-keys", gtype);
        settings.apply();

        if(k === "OpenWeatherMap") {
            this.#validateOwm3Key(v).then(msg => {
                if(msg !== null) {
                    const alert = new Gtk.AlertDialog({
                        message: _g("API Key Warning"),
                        detail: msg
                    });
                    alert.show(this.#window);
                }
            });
        }
    }

    #setApiHost(settings : Gio.Settings, apiHostRow : Adw.EntryRow, wProvRow : Adw.ComboRow) {
        const v = normalizeApiHost(apiHostRow.text);
        const i = wProvRow.selected;
        const k = WeatherProviderApiKeys[i];

        const map = readGTypeABSS(settings.get_value("api-hosts"));
        if(v.length > 0) map.set(k, v);
        else map.delete(k);

        const gtype = writeGTypeABSS(map);
        settings.set_value("api-hosts", gtype);
        settings.apply();
        apiHostRow.text = v;

        // For QWeather, there are no guarantees given on the API host:
        // https://dev.qweather.com/en/docs/configuration/api-host/
    }

    /**
     * Returns an error message, or null if valid or unable to validate.
     */
    async #validateOwm3Key(key : string) : Promise<string | null> {
        const soup = new LibSoup();
        try {
            const resp = await soup.fetchJson(
                "https://api.openweathermap.org/data/3.0/onecall",
                {
                    "lat": "40.73", "lon": "-73.93",
                    "exclude": "current,minutely,hourly,daily,alerts",
                    "appid": key
                }
            );

            if(resp.status === 401) return _g("Key is invalid or is not subscribed to the One Call 3.0 API.");
            else return null;
        } catch(e) {
            if(isNoInternet(e)) return null;
            else return _g("Error when validating API Key: %s").format(e?.toString() ?? _g("Unknown Error"));
        } finally {
            soup.free();
        }
    }

    /**
     * Returns an error message for invalid QWeather credentials, or null otherwise.
     */
    async #validateQWeatherCreds(key : string, host : string) : Promise<string | null> {
        const normalizedHost = normalizeApiHost(host);
        if(!normalizedHost) return _g("Host is required.");
        const soup = new LibSoup();
        try {
            const resp = await soup.fetchJson(
                `https://${normalizedHost}/weather/v1/current/39.92/116.41`,
                { },
                false,
                { "X-QW-Api-Key": key }
            );

            if(resp.status === 401) return _g("Key or host is invalid.");

            const error = resp.body?.error;
            const invalidHost = error?.title === "Invalid Host" ||
                (typeof error?.type === "string" && error.type.endsWith("#invalid-host"));
            if(resp.status === 403 && invalidHost) return _g("Host is invalid.");

            return null;
        } catch(e) {
            // We can error on NoInternet because this is a manually triggered action
            if(isNoInternet(e)) return _g("No Internet");
            else if(e instanceof SyntaxError) return _g("The API Host returned an invalid response.");
            else return _g("Error when validating credentials.");
        } finally {
            soup.free();
        }
    }

}
