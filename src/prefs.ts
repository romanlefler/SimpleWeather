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

import { ExtensionPreferences } from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js";
import { GeneralPage } from "./preferences/generalPage.js";
import { LocationsPage } from "./preferences/locationsPage.js";
import { ExtensionMetadata } from "resource:///org/gnome/shell/extensions/extension.js";
import { AboutPage } from "./preferences/aboutPage.js";

export default class SimpleWeatherPreferences extends ExtensionPreferences {

    readonly #metadata : ExtensionMetadata;

    constructor(metadata : ExtensionMetadata) {
        super(metadata);
        this.#metadata = metadata;
    }

    async fillPreferencesWindow(window: Adw.PreferencesWindow): Promise<void> {
        
        const settings = this.getSettings();
        settings.delay();

        window.add(new GeneralPage(settings));
        window.add(new LocationsPage(settings, window));
        window.add(new AboutPage(settings, this.#metadata));

    }

}
