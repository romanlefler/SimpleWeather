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
import Gtk from "gi://Gtk";

import { ExtensionPreferences } from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js";
import { GeneralPage } from "./preferences/generalPage.js";
import { LocationsPage } from "./preferences/locationsPage.js";
import { ExtensionMetadata } from "resource:///org/gnome/shell/extensions/extension.js";
import { AboutPage } from "./preferences/aboutPage.js";
import { setUpGettext } from "./gettext.js";
import { gettext as prefsGettext } from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js";
import { initLocales } from "./lang.js";
import { gettext as _g } from "./gettext.js";

export default class SimpleWeatherPreferences extends ExtensionPreferences {

    readonly #metadata : ExtensionMetadata;

    constructor(metadata : ExtensionMetadata) {
        super(metadata);
        this.#metadata = metadata;
    }

    async fillPreferencesWindow(window: Adw.PreferencesWindow): Promise<void> {
        setUpGettext(prefsGettext);
        const settings = this.getSettings();
        settings.delay();
        this.checkLocales(window, settings);

        window.add(new GeneralPage(settings));
        window.add(new LocationsPage(settings, window));
        window.add(new AboutPage(settings, this.#metadata, window));

    }

    // Is this whole thing necessary?
    // I don't know
    checkLocales(window : Adw.PreferencesWindow, settings : Gio.Settings) {
        const errMsg = initLocales();
        if(errMsg && !settings.get_boolean("dont-check-locales")) {
            const dialog = new Gtk.AlertDialog({
                message: _g(
                    "SimpleWeather doesn't know how to handle your locale.\n\tError - %s\n" +
                    "Please consider submitting a bug report on GitHub."
                ).format(errMsg),
                buttons: [ _g("Ignore"), _g("Open GitHub"), _g("Don't Show Again") ],
                cancel_button: 0,
                default_button: 1
            });
            const id = window.connect("notify::visible", () => {
                window.disconnect(id);
                dialog.choose(window, null, (_, result) => {
                    const idx = dialog.choose_finish(result);
                    if (idx === 1) {
                        const url = "https://github.com/romanlefler/SimpleWeather";
                        Gio.AppInfo.launch_default_for_uri_async(url, null, null, (_, result) => {
                            Gio.AppInfo.launch_default_for_uri_finish(result);
                        });
                    }
                    else if (idx === 2) {
                        settings.set_boolean("dont-check-locales", true);
                        settings.apply();
                    }
                });
            });
        }
    }

}
