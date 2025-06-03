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
import { ExtensionMetadata } from "resource:///org/gnome/shell/extensions/extension.js";

function md(s : string, classes? : string[]) : Gtk.Label {
    const props : Partial<Gtk.Label.ConstructorProps> = {
        label: s,
        use_markup: true,
    };
    if(classes) props.css_classes = classes;
    return new Gtk.Label(props);
}

export class AboutPage extends Adw.PreferencesPage {

    static {
        GObject.registerClass(this);
    }

    constructor(settings : Gio.Settings, metadata : ExtensionMetadata) {

        super({
            title: "About",
            icon_name: "help-about-symbolic"
        });

        const topGroup = new Adw.PreferencesGroup();
        const topBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL
        });
        topBox.append(md("SimpleWeather for GNOME", [ "simpleweather-h1" ]));
        topBox.append(md("Roman Lefler", [ "simpleweather-h2" ]));
        topBox.append(md(
            `<a href=\"https://github.com/romanlefler/SimpleWeather\">${"GitHub Repository"}</a>`,
        ));
        topGroup.add(topBox);
        this.add(topGroup);

        const infoGroup = new Adw.PreferencesGroup();
        const versionRow = new Adw.ActionRow({
            title: "SimpleWeather Version"
        });
        versionRow.add_suffix(new Gtk.Label({
            label: metadata["version-name"] ?? "Unknown"
        }));
        infoGroup.add(versionRow);
        this.add(infoGroup);

        const bottomGroup = new Adw.PreferencesGroup();
        const bottomBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL
        });
        const owrLink = "<a href=\"https://github.com/penguin-teal/gnome-openweather\">OpenWeather Refined</a>";
        bottomBox.append(md(
            "This extension is a rewrite of the %s project.".format(owrLink)
        ));
        bottomGroup.add(bottomBox);
        this.add(bottomGroup);
    }

}

