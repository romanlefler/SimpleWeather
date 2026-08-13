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
import Meta from "gi://Meta";
import St from "gi://St";
import { ExtensionMetadata } from "resource:///org/gnome/shell/extensions/extension.js";
import * as PopupMenu from "resource:///org/gnome/shell/ui/popupMenu.js";
import { Config, PopupLayout as PopupLayoutPreset } from "./config.js";
import { gettext as _g } from "./gettext.js";
import {
    PopupLayout,
    createPopupLayout
} from "./layouts/layout.js";
import { theme, themeInitAll } from "./theme.js";
import { Weather } from "./weather.js";

function copyrightText(providerName : string) : string {
    return `${_g("Weather Data")} \u00A9 ${providerName} ${new Date().getFullYear()}`;
}

// Widget must have reactive and track_hover true.
function setPointer(widget : Clutter.Actor) : void {
    // @ts-ignore GNOME 50
    if(widget.set_cursor_type) {
        // @ts-ignore GNOME 50
        widget.set_cursor_type(Clutter.CursorType.POINTER);
    } else if(global?.display?.set_cursor) {
        widget.connect("enter-event", () => {
            global.display.set_cursor(Meta.Cursor?.POINTER ?? 5);
        });
        widget.connect("leave-event", () => {
            global.display.set_cursor(Meta.Cursor?.DEFAULT ?? 2);
        });
    }
}

export interface PopupCtorArgs {
    config : Config;
    metadata : ExtensionMetadata;
    openPreferences : () => void;
    menu : PopupMenu.PopupMenu;
    settings : Gio.Settings;
    refreshWeather : () => Promise<void>;
}

export class Popup {
    readonly #args : PopupCtorArgs;
    readonly #copyright : St.Label;
    readonly #placeLabel : St.Label;
    readonly #placeBtn : St.Button;
    readonly #refreshBtn : St.Button | null;
    readonly #layoutItem : PopupMenu.PopupBaseMenuItem;
    readonly #footerItem : PopupMenu.PopupBaseMenuItem;
    readonly #menuBox : St.BoxLayout;

    #layout : PopupLayout;
    #layoutPreset : PopupLayoutPreset;
    #cachedWeather? : Weather;
    #err : string | null = null;

    constructor(args : PopupCtorArgs) {
        this.#args = args;
        this.#layoutPreset = args.config.getPopupLayout();
        this.#layout = this.#createLayout(this.#layoutPreset);

        this.#layoutItem = new PopupMenu.PopupBaseMenuItem({ reactive: false });
        theme(this.#layoutItem, "bg");
        this.#layoutItem.actor.add_child(this.#layout.actor);

        const footer = new St.BoxLayout({ vertical: false });
        this.#copyright = new St.Label({
            text: "",
            x_expand: false,
            x_align: Clutter.ActorAlign.START,
            y_align: Clutter.ActorAlign.CENTER
        });
        footer.add_child(this.#copyright);

        this.#footerItem = new PopupMenu.PopupBaseMenuItem({ reactive: false });
        theme(this.#footerItem, "bg");
        this.#footerItem.actor.add_child(footer);

        if(args.config.getShowRefreshButton()) {
            this.#refreshBtn = new St.Button({
                child: new St.Icon({
                    icon_name: "view-refresh-symbolic",
                    style_class: "simpleweather-settings-icon"
                }),
                reactive: true,
                can_focus: true,
                track_hover: true,
                accessible_name: _g("Refresh"),
                x_expand: false,
                x_align: Clutter.ActorAlign.END,
                y_align: Clutter.ActorAlign.CENTER,
                style_class: "message-list-clear-button button"
            });
            theme(this.#refreshBtn, "button");
            this.#refreshBtn.connect("clicked", () => this.#triggerRefresh());
            this.#footerItem.actor.add_child(this.#refreshBtn);
            setPointer(this.#refreshBtn);
        } else {
            this.#refreshBtn = null;
        }

        this.#placeLabel = new St.Label();
        this.#placeBtn = new St.Button({
            child: this.#placeLabel,
            style_class: "button",
            margin_left: 20,
            margin_right: 20,
            reactive: true,
            opacity: 255,
            x_expand: true
        });
        theme(this.#placeBtn, "button");
        this.#placeBtn.connect("clicked", () => this.#onPlaceClicked());
        this.#footerItem.actor.add_child(this.#placeBtn);

        const settingsBtn = new St.Button({
            child: new St.Icon({
                icon_name: "preferences-system-symbolic",
                style_class: "simpleweather-settings-icon"
            }),
            reactive: true,
            can_focus: true,
            track_hover: true,
            accessible_name: _g("Settings"),
            x_expand: false,
            x_align: Clutter.ActorAlign.END,
            y_align: Clutter.ActorAlign.CENTER,
            style_class: "message-list-clear-button button"
        });
        theme(settingsBtn, "button");
        settingsBtn.connect("clicked", () => {
            args.menu.toggle();
            args.openPreferences();
        });
        this.#footerItem.actor.add_child(settingsBtn);

        setPointer(this.#placeBtn);
        setPointer(settingsBtn);

        this.#menuBox = args.menu.box;
        args.menu.addMenuItem(this.#layoutItem);
        args.menu.addMenuItem(this.#footerItem);
    }

    get layoutPreset() : PopupLayoutPreset {
        return this.#layoutPreset;
    }

    /**
     * Replaces only the weather presentation. The footer and its controls
     * remain mounted and retain their state.
     */
    setLayout(preset : PopupLayoutPreset) {
        if(preset === this.#layoutPreset) return;

        this.#layoutItem.actor.remove_child(this.#layout.actor);
        this.#layout.destroy();
        this.#layoutPreset = preset;
        this.#layout = this.#createLayout(preset);
        this.#layoutItem.actor.add_child(this.#layout.actor);
        const themeName = this.#args.config.getTheme();
        if(themeName) themeInitAll(this.#layout.actor, themeName);
        if(this.#cachedWeather) this.#layout.updateGui(this.#cachedWeather);
    }

    setError(message : string | null) {
        this.#err = message;
    }

    updateGui(weather : Weather | undefined) {
        if(!weather) {
            this.#displayError();
            return;
        }

        const old = this.#cachedWeather;
        this.#cachedWeather = weather;
        this.#layout.updateGui(weather);
        this.#placeLabel.text = weather.loc.getName();

        const copyright = copyrightText(weather.providerName);
        this.#copyright.text = this.#err ? `${copyright} | ${this.#err}` : copyright;

        if(old) this.#menuBox.remove_style_class_name(`swa-${old.condit}`);
        this.#menuBox.add_style_class_name(`swa-${weather.condit}`);
        if(!old || old.isNight !== weather.isNight) {
            this.#menuBox.remove_style_class_name(`swa-${weather.isNight ? "day" : "night"}`);
            this.#menuBox.add_style_class_name(`swa-${weather.isNight ? "night" : "day"}`);
        }

        if(this.#err) this.#displayError(copyright);
        this.#setRefreshStatus(false);
    }

    destroy(_menu : PopupMenu.PopupMenu) {
        this.#layout.destroy();
        this.#layoutItem.destroy();
        this.#footerItem.destroy();
    }

    #createLayout(preset : PopupLayoutPreset) : PopupLayout {
        return createPopupLayout(preset, {
            config: this.#args.config,
            metadata: this.#args.metadata
        });
    }

    #onPlaceClicked() {
        if(this.#err) {
            this.#triggerRefresh();
            return;
        }
        const placeCount = this.#args.config.getLocations().length;
        if(placeCount === 1) return;
        this.#setRefreshStatus(true);
        const index = this.#args.config.getMainLocationIndex();
        this.#args.settings.set_int64(
            "main-location-index",
            index === placeCount - 1 ? 0 : index + 1
        );
    }

    #setRefreshStatus(fetching : boolean) {
        const opacity = fetching ? 127 : 255;
        this.#placeBtn.reactive = !fetching;
        this.#placeBtn.opacity = opacity;
        if(this.#refreshBtn) {
            this.#refreshBtn.reactive = !fetching;
            this.#refreshBtn.opacity = opacity;
        }
    }

    #triggerRefresh() {
        this.#setRefreshStatus(true);
        this.setError(null);
        this.#args.refreshWeather().finally(() => this.#setRefreshStatus(false));
    }

    #displayError(copyright? : string) {
        this.#copyright.text = copyright
            ? `${copyright} | ${this.#err ?? ""}`
            : this.#err ?? "";
        this.#placeLabel.text = _g("Retry");
        this.#placeBtn.reactive = true;
        this.#placeBtn.opacity = 255;
    }
}
