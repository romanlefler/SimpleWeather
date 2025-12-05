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

import Clutter from "gi://Clutter";
import Gio from "gi://Gio";
import GLib from "gi://GLib";
import GObject from "gi://GObject";
import St from 'gi://St';
import { gettext as _g } from "./gettext.js"
import { ModalDialog } from "resource:///org/gnome/shell/ui/modalDialog.js";
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

function paragraph(text : string, ...formatArgs : string[]) : St.Label {
    const label = new St.Label({
        text: text.format(...formatArgs),
        style_class: "dialog-description",
        x_expand: true,
        y_expand: true,
        reactive: false,
        x_align: Clutter.ActorAlign.FILL,
        y_align: Clutter.ActorAlign.FILL
    });
    label.clutter_text.line_wrap = true;
    return label;
}

class WelcomeDialog extends ModalDialog {

    readonly #abort : St.Button;
    readonly #okay : St.Button;

    static {
        GObject.registerClass(this);
    }

    constructor() {
        super();

        const title = _g("Welcome to %s").format("SimpleWeather");
        const titleLabel = new St.Label({
            text: title,
            style_class: "modal-dialog-title",
            style: "font-weight: bold;",
            x_align: Clutter.ActorAlign.CENTER,
            y_align: Clutter.ActorAlign.CENTER,
            margin_bottom: 25
        });
        this.contentLayout.add_child(titleLabel);

        const box = new St.BoxLayout({
            vertical: true,
            style_class: "dialog-content",
            x_expand: true,
            y_expand: true,
            x_align: Clutter.ActorAlign.FILL,
            y_align: Clutter.ActorAlign.CENTER
        });

        const weatherProv = paragraph(_g(
            "%s occasionally connects to the selected weather service. " +
            "By default, it will use the Internet to connect to:\n" +
            "  \u2022  %s, an %s service for weather\n" +
            "  \u2022  %s, optional for resolving the current location\n" +
            "  \u2022  %s, for searching locations by name\n\n"
        ), "SimpleWeather", "Open-Meteo", "AGPL 3.0", "ipapi.co", "Nominatim");
        box.add_child(weatherProv);

        const thanks = paragraph(_g(
            "Thank you for installing %s!"
        ),"SimpleWeather");
        box.add_child(thanks);

        const spacer = new St.Widget({ height: 30 });
        box.add_child(spacer);

        const buttonBox = new St.BoxLayout({
            vertical: false,
            x_expand: true,
            y_expand: false,
            x_align: Clutter.ActorAlign.FILL,
            margin_top: 25
        });

        const abort = new St.Button({ 
            label: _g("Abort"),
            x_expand: true,
            style_class: "modal-dialog-button",
        });
        buttonBox.add_child(abort);

        const okay = new St.Button({ 
            label: "OK",
            x_expand: true,
            style_class: "modal-dialog-button",
        });
        buttonBox.add_child(okay);
        box.add_child(buttonBox);

        this.contentLayout.add_child(box);
        okay.grab_key_focus();

        this.#abort = abort;
        this.#okay = okay;
    }

    choose() : Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            this.#abort.connect("clicked", () => {
                this.close();
                resolve(false);
            });
            this.#okay.connect("clicked", () => {
                this.close();
                resolve(true);
            });
            this.open();
        });
    }
}

export async function showWelcome() : Promise<boolean> {
    const dialog = new WelcomeDialog();
    return dialog.choose();
}

class ManualConfigDialog extends ModalDialog {

    readonly #okay : St.Button;

    static {
        GObject.registerClass(this);
    }

    constructor() {
        super();

        const title = _g("Manual Configuration");
        const titleLabel = new St.Label({
            text: title,
            style_class: "modal-dialog-title",
            style: "font-weight: bold;",
            x_align: Clutter.ActorAlign.CENTER,
            y_align: Clutter.ActorAlign.CENTER,
            margin_bottom: 25
        });
        this.contentLayout.add_child(titleLabel);

        const box = new St.BoxLayout({
            vertical: true,
            style_class: "dialog-content",
            x_expand: true,
            y_expand: true,
            x_align: Clutter.ActorAlign.FILL,
            y_align: Clutter.ActorAlign.CENTER
        });

        const msg = paragraph(_g("Failed to detect location."));
        box.add_child(msg);

        const directions = paragraph(_g("Please configure your location and units manually."));
        box.add_child(directions);

        const spacer = new St.Widget({ height: 30 });
        box.add_child(spacer);

        const buttonBox = new St.BoxLayout({
            vertical: false,
            x_expand: true,
            y_expand: false,
            x_align: Clutter.ActorAlign.FILL,
            margin_top: 25
        });

        const okay = new St.Button({ 
            label: "OK",
            x_expand: true,
            style_class: "modal-dialog-button",
        });
        buttonBox.add_child(okay);
        box.add_child(buttonBox);

        this.contentLayout.add_child(box);
        okay.grab_key_focus();

        this.#okay = okay;
    }

    choose() : Promise<void> {
        return new Promise<void>((resolve) => {
            this.#okay.connect("clicked", () => {
                this.close();
                resolve();
            });
            this.open();
        });
    }
}

export async function showManualConfig(openPrefs : () => void) : Promise<void> {
    const dialog = new ManualConfigDialog();
    return dialog.choose().then(() => openPrefs());
}

