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
import Cogl from "gi://Cogl";
import Gio from "gi://Gio";
import GLib from "gi://GLib";
import St from 'gi://St';
import { Extension } from "resource:///org/gnome/shell/extensions/extension.js";
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import { createProvider, Provider } from "./providers/provider.js";
import { OpenMeteo } from "./providers/openmeteo.js";
import { LibSoup } from "./libsoup.js";
import { Config } from "./config.js";
import { Weather } from "./weather.js";
import { delayTask, removeSourceIfTruthy } from "./utils.js";
import { displayTemp, displayTime, initLocales } from "./lang.js";
import { freeMyLocation, setUpMyLocation } from "./myLocation.js";
import { setUpGettext, gettext as _g } from "./gettext.js";
import { gettext as shellGettext } from "resource:///org/gnome/shell/extensions/extension.js";
import { Popup } from "./popup.js";
import { PopupMenu } from "resource:///org/gnome/shell/ui/popupMenu.js";
import { showWelcome } from "./welcome.js";
import { setFirstTimeConfig } from "./autoConfig.js";
import { displayDetail } from "./details.js";
import { theme, themeInitAll, themeRemoveAll } from "./theme.js";

export default class SimpleWeatherExtension extends Extension {

    #gsettings? : Gio.Settings;
    #indicator? : PanelMenu.Button;
    #panelLabel? : St.Label;
    #secondPanelLabel? : St.Label;
    #panelIcon? : St.Icon;
    #popup? : Popup;
    #hasAddedIndicator : boolean = false;
    #sunTimeLabel? : St.Label;
    #sunTimeIcon? : St.Icon;

    #cachedWeather? : Weather;
    #config? : Config;
    #libsoup? : LibSoup;
    #provider? : Provider;

    #fetchLoopId? : number;
    #delayFetchId? : number;
    #waitLayoutId? : number;

    #resolverFailCount : number = 0;
    #indicIsErrored : boolean = false;

    /**
     * Waits for the layout manager's starting up property to be false.
     * @returns True if layout manager is done, otherwise false if wait is aborted.
     */
    async #waitForLayoutMan() : Promise<boolean> {
        if(!Main.layoutManager._startingUp) return true;
        if(this.#waitLayoutId) {
            throw new Error("Cannot wait for layout twice at once.");
        }

        return new Promise<boolean>(resolve => {
            const id = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 500, () => {
                if (!Main.layoutManager._startingUp) {
                    this.#waitLayoutId = undefined;
                    resolve(true);
                    return GLib.SOURCE_REMOVE;
                }
                else return GLib.SOURCE_CONTINUE;
            });
            this.#waitLayoutId = id;
        });
    }

    /**
     * Called by GNOME Extensions when this extension is enabled.
     * This is the entry point.
     */
    enable() {
        // Set up a couple necessaary things already
        setUpGettext(shellGettext);
        this.#gsettings = this.getSettings();
        initLocales();
        // Call an async enable method
        this.#asyncEnable().catch(e => {
            console.error(e);
            throw e;
        });
    }

    async #asyncEnable() {
        // First wait for the layout manager or the layout won't show
        await this.#waitForLayoutMan();
        // Show welcome screen if user's never seen it
        if(!this.#gsettings!.get_boolean("is-activated")) {
            const shouldContinue = await showWelcome();
            // If the user clicked abort, abort enabling
            if(!shouldContinue) return;
            // Otherwise mark the welcome screen as accepted
            this.#gsettings!.set_boolean("is-activated", true);

            // They both need basic setup, but set first time config
            // requires basic setup before running
            this.#basicSetup();
            await setFirstTimeConfig(this.#gsettings!);
        }
        else this.#basicSetup();

        // Continue on like normal
        this.#enablePastWelcome();
    }

    #basicSetup() {
        // Set everything up
        // Gettext and gsettings are already set up
        this.#config = new Config(this.#gsettings!);
        this.#libsoup = new LibSoup();
        this.#provider = createProvider(this.#libsoup, this.#config);
        setUpMyLocation(this.#libsoup, this.#config);
    }

    #createIndicator() : PanelMenu.Button {
        const indic = new PanelMenu.Button(0, "Weather", false);
        this.#popup = new Popup(
            this.#config!,
            this.metadata,
            this.openPreferences.bind(this),
            indic.menu as PopupMenu,
            this.#gsettings!
        );

        const layout = new St.BoxLayout({
            vertical: false
        });

        const hasDetail1 = this.#config!.getPanelDetail() != null;
        const hasDetail2 = this.#config!.getSecondaryPanelDetail() !== null;
        const showIcon = this.#config!.getShowPanelIcon();

        this.#panelLabel = hasDetail1 ? new St.Label({
            text: "...",
            y_align: Clutter.ActorAlign.CENTER,
            y_expand: true
        }) : undefined;
        this.#secondPanelLabel = hasDetail2 ? new St.Label({
            text: "...",
            y_align: Clutter.ActorAlign.CENTER,
            y_expand: true,
            style_class: "simpleweather-second-panel-label"
        }) : undefined;
        this.#panelIcon = showIcon ? new St.Icon({
            icon_name: "view-refresh-symbolic",
            style_class: "system-status-icon"
        }) : undefined;
        this.#sunTimeLabel = new St.Label({
            text: "...",
            y_align: Clutter.ActorAlign.CENTER,
            y_expand: true,
            style: "padding-left: 8px;"
        });
        this.#sunTimeIcon = new St.Icon({
            icon_name: "daytime-sunset-symbolic",
            style_class: "system-status-icon"
        });

        if(this.#panelLabel) layout.add_child(this.#panelLabel);
        if(this.#secondPanelLabel) layout.add_child(this.#secondPanelLabel);
        if(this.#panelIcon) layout.add_child(this.#panelIcon);
        if(this.#config!.getShowSunTime()) {
            layout.add_child(this.#sunTimeLabel);
            layout.add_child(this.#sunTimeIcon);
        }
        indic.add_child(layout);

        const actor = (indic.menu as PopupMenu).box;
        theme(actor, "menu");
        // @ts-ignore
        indic.menu.connect("open-state-changed", (_, isOpen : boolean) => {
            if(isOpen) actor.add_style_class_name("swa-open");
            else actor.remove_style_class_name("swa-open");
        });

        const themeName = this.#config!.getTheme();
        if(themeName) themeInitAll(indic.menu.actor, themeName);
        return indic;
    }

    #enablePastWelcome() {
        // This is normal extension enabling now
        
        // Add the menu into the top bar
        this.#indicator = this.#createIndicator();
        // #indicator is added to panel in #updateGui

        // Set up a timer to refresh the weather on repeat
        this.#fetchLoopId = GLib.timeout_add_seconds(
            GLib.PRIORITY_DEFAULT,
            15 * 60,
            this.#updateWeather.bind(this)
        );

        // Some settings require the weather to be re-fetched
        this.#config!.onMainLocationChanged(this.#updateWeather.bind(this));
        this.#config!.onMyLocationProviderChanged(this.#updateWeather.bind(this));
        this.#config!.onWeatherProviderChanged(() => {
            this.#provider = createProvider(this.#libsoup!, this.#config!);
            this.#updateWeather();
        });
        // Some settings just require a GUI update
        this.#config!.onAnyUnitChanged(this.#updateGui.bind(this));
        this.#config!.onDetailsListChanged(this.#updateGui.bind(this));
        this.#config!.onSymbolicIconsChanged(this.#updateGui.bind(this));
        this.#config!.onAlwaysPackagedIconsChanged(this.#updateGui.bind(this));
        // Some require extra stuff
        this.#config!.onShowSunTimeChanged(b => {
            if(!this.#indicator) return;
            const layout = this.#indicator!.get_first_child()!;
            if (b) {
                layout.add_child(this.#sunTimeLabel!);
                layout.add_child(this.#sunTimeIcon!);
            }
            else {
                layout.remove_child(this.#sunTimeLabel!);
                layout.remove_child(this.#sunTimeIcon!);
            }
        });
        this.#config!.onShowSunTimeAsCountdownChanged(this.#rebuildIndicator.bind(this));
        this.#config!.onPanelDetailChanged(this.#rebuildIndicator.bind(this));
        this.#config!.onSecondaryPanelDetailChanged(this.#rebuildIndicator.bind(this));
        this.#config!.onShowPanelIconChanged(this.#rebuildIndicator.bind(this));
        this.#config!.onPanelPositionChanged(this.#rebuildIndicator.bind(this));
        this.#config!.onThemeChanged(this.#rebuildIndicator.bind(this));
        this.#config!.onHighContrastChanged(this.#rebuildIndicator.bind(this));

        // First weather fetch
        this.#updateWeather();
    }

    #rebuildIndicator() {
        this.#indicator?.destroy();
        this.#indicator = this.#createIndicator();
        this.#hasAddedIndicator = false;
        this.#updateGui();
    }

    /**
     * Called by GNOME Extensions when this extension is disabled.
     * Everything must be manually freed since this class may not be
     * garbage-collected.
     */
    disable() {
        // removeSourceIfTruthy is a shorthand for removing source
        // if it is defined then returning undefined
        this.#fetchLoopId = removeSourceIfTruthy(this.#fetchLoopId);
        this.#delayFetchId = removeSourceIfTruthy(this.#delayFetchId);
        this.#waitLayoutId = removeSourceIfTruthy(this.#waitLayoutId);

        if(this.#popup && this.#indicator) {
            this.#popup.destroy(this.#indicator.menu as PopupMenu);
            this.#popup = undefined;
        }
        this.#hasAddedIndicator = false;
        this.#panelIcon = undefined;
        this.#panelLabel = undefined;
        this.#secondPanelLabel = undefined;
        this.#indicator?.destroy();
        this.#indicator = undefined;

        this.#gsettings = undefined;
        this.#libsoup?.free();
        this.#libsoup = undefined;
        this.#config?.free();
        this.#config = undefined;
                    this.#updateWeather();

        freeMyLocation();
        this.#provider = undefined;
        this.#cachedWeather = undefined;
    }

    #updateWeather() {
        this.#updateWeatherAsync().catch(err => {
            console.error(err);
            // This happens on boot presumably when things are loaded
            // out of order, try max 10 times
            //
            // This tries for just over a minute, which should be plenty of time for
            // Wi-Fi to start
            //
            // Fail count never resets so that if repeatedly trying to connect fails once
            // we don't constantly retry for a minute every time the timer goes off
            if(err instanceof Gio.ResolverError && ++this.#resolverFailCount <= 10) {
                this.#delayFetchId = delayTask(7.5, () => {
                    this.#delayFetchId = undefined;
                    this.#updateWeather();
                });
            // Maybe this error happened because of failed fetch or going over fail count
            } else if(!this.#cachedWeather) {
                this.#indicator = this.#createIndicator();
                if(this.#panelIcon) this.#panelIcon.icon_name = "error-app-symbolic";
                if(this.#panelLabel) this.#panelLabel.text = "Error!";
                if(this.#secondPanelLabel) this.#secondPanelLabel.visible = false;
                if(this.#sunTimeLabel) this.#sunTimeLabel.visible = false;
                if(this.#sunTimeIcon) this.#sunTimeIcon.visible = false;
                this.#addIndicIfNeeded();
            }
        });
        return GLib.SOURCE_CONTINUE;
    }

    async #updateWeatherAsync() {

        if(!this.#provider) throw new Error("Provider was undefined!");
        this.#cachedWeather = await this.#provider!.fetchWeather();
        this.#updateGui();
    }

    #addIndicIfNeeded() {
        if (!this.#hasAddedIndicator) {
            this.#hasAddedIndicator = true;
            const pos = this.#config!.getPanelPosition();
            Main.panel.addToStatusArea(this.uuid, this.#indicator!, pos.priority, pos.box);
        }
    }

    #updateGui() {
        const w = this.#cachedWeather;
        if(!w) return;

        const panelDetail = this.#config!.getPanelDetail();
        if(panelDetail !== null && this.#panelLabel) {
            const panelText = displayDetail(w, panelDetail, _g, this.#config!, true);
            this.#panelLabel.text = panelText;
        }

        const secondPanelDetail = this.#config!.getSecondaryPanelDetail();
        if(secondPanelDetail !== null && this.#secondPanelLabel) {
            const secondPanelText = displayDetail(w, secondPanelDetail, _g, this.#config!, true);
            this.#secondPanelLabel.visible = true;
            this.#secondPanelLabel.text = secondPanelText;
        }

        if(this.#panelIcon) {
            const suffix = this.#config!.getSymbolicIcons() ? "-symbolic" : "";
            this.#panelIcon.icon_name = w.gIconName + suffix;
        }

        const showSunset = w.sunset < w.sunrise;
        const sunTime = showSunset ? w.sunset : w.sunrise;

        if(this.#sunTimeLabel) {
            this.#sunTimeLabel.visible = true;
            const useAbs = !this.#config!.getShowSunTimeAsCountdown();
            if(useAbs) this.#sunTimeLabel.text = displayTime(sunTime, this.#config!);
            else this.#sunTimeLabel.text = w.sunEventCountdown.display(this.#config!);
        }
        if(this.#sunTimeIcon) {
            this.#sunTimeIcon.visible = true;
            this.#sunTimeIcon.icon_name = `daytime-${showSunset ? "sunset" : "sunrise"}-symbolic`;
        }

        this.#popup!.updateGui(w);

        this.#addIndicIfNeeded();
    }

}
