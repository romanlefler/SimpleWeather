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
import Gdk from "gi://Gdk";
import Gtk from "gi://Gtk";
import Gio from "gi://Gio";
import Adw from "gi://Adw";
import { gettext as _g } from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js";
import { detailName, Details, displayDetail } from "../details.js";
import { Weather } from "../weather.js";
import { Direction, Percentage, Pressure, RainMeasurement, Speed, SpeedAndDir, Temp } from "../units.js";
import { Location } from "../location.js";
import { Config, writeGTypeAS } from "../config.js";

const MOCK_WEATHER : Weather = {
    temp: new Temp(71),
    gIconName: "weather-clear-symbolic",
    isNight: false,
    sunset: new Date(),
    sunrise: new Date(),
    forecast: [ ],
    hourForecast: [ ],
    feelsLike: new Temp(77),
    wind: new Speed(8),
    gusts: new Speed(14),
    windDir: new Direction(0),
    humidity: new Percentage(87),
    pressure: new Pressure(24),
    uvIndex: 7,
    precipitation: new RainMeasurement(0.0),
    providerName: "Open-Meteo",
    loc: Location.newCoords("Dallas", 32.7792, -96.8089),
    windSpeedAndDir: new SpeedAndDir(new Speed(8), new Direction(0)),
    cloudCover: new Percentage(44)
};

export class DetailsPage extends Adw.PreferencesPage {

    readonly #settings : Gio.Settings;
    readonly #config : Config;
    #clickedDeet? : Details;
    #clickedWidget? : Gtk.Widget;

    static {
        GObject.registerClass(this);
    }

    constructor(settings : Gio.Settings) {

        super({
            title: _g("Details"),
            icon_name: "view-list-symbolic"
        });
        this.#settings = settings;

        const panelGroup = new Adw.PreferencesGroup({
            title: _g("Panel")
        });
        const detailsArr = Object.values(Details);
        const detailsNames = [ ];
        for(let d of detailsArr) {
            detailsNames.push(_g(detailName[d] as string));
        }

        const detailsModel = new Gtk.StringList({
            strings: detailsNames
        });
        const panelDetailSel = detailsArr.indexOf(this.#settings.get_string("panel-detail") as Details);
        const panelDetailRow = new Adw.ComboRow({
            title: _g("Panel Detail"),
            model: detailsModel,
            selected: Math.max(0, panelDetailSel)
        });
        panelDetailRow.connect("notify::selected", (widget : Adw.ComboRow) => {
            settings.set_string("panel-detail", detailsArr[widget.selected]);
            settings.apply();
        });
        panelGroup.add(panelDetailRow);
        this.add(panelGroup);

        const curGroup = new Adw.PreferencesGroup({
            title: _g("Pop-Up"),
            description: _g("Drag-and-drop from bottom to configure the pop-up")
        });

        const stringFmt = Gdk.ContentFormats.new_for_gtype(GObject.TYPE_STRING);
        this.#config = new Config(settings);

        // Selected
        const curBox = new Gtk.FlowBox({
            orientation: Gtk.Orientation.HORIZONTAL,
            selection_mode: Gtk.SelectionMode.NONE
        });
        const initialDetails = this.#config.getDetailsList();
        for(let i = 0; i < 8; i++) {
            const selection = new Gtk.Frame({
                receives_default: true,
                can_focus: true
            });
            let initialDeet = initialDetails[i] as Details;
            if(!Object.values(Details).includes(initialDeet)) initialDeet = "invalid" as Details;
            const selLabel = new Gtk.Label({
                label: displayDetail(MOCK_WEATHER, initialDeet, _g, this.#config)
            });
            selection.child = selLabel;

            const dropTarget = new Gtk.DropTarget({
                formats: stringFmt,
                actions: Gdk.DragAction.COPY
            });
            dropTarget.connect("drop", (_s, value, _x, _y) => {
                // The types here for value are wrong, it is just a JS string
                if(typeof value !== "string") throw new Error("Drop received unknown type.");
                if(!Object.values(Details).includes(value)) return false;
                const deet = value as Details;
                this.#setDetail(selLabel, i, deet);
                return true;
            });
            selection.add_controller(dropTarget);
            selection.add_controller(new Gtk.DropControllerMotion());
            
            // This is for 
            const gesture = new Gtk.GestureClick();
            gesture.connect("pressed", (_s, _n, _x, _y) => {
                if(!this.#clickedDeet) return;

                this.#setDetail(selLabel, i, this.#clickedDeet);
                this.#unsetClickedDetail();
            });
            selection.add_controller(gesture);

            curBox.append(selection);
        }

        const pool = new Gtk.FlowBox({
            orientation: Gtk.Orientation.HORIZONTAL,
            selection_mode: Gtk.SelectionMode.NONE
        });
        const items = Object.values(Details);
        for(const d of items) {
            const btn = new Gtk.Button({
                label: displayDetail(MOCK_WEATHER, d, _g, this.#config),
                can_focus: true,
            });
            // get_data/set_data not supported in GJS
            (btn as any)["simpleweather-detail"] = d;

            const dragSrc = new Gtk.DragSource({
                actions: Gdk.DragAction.COPY
            });
            dragSrc.connect("prepare", (_s, _x, _y) => {
                const gval = new GObject.Value();
                gval.init(GObject.TYPE_STRING);
                gval.set_string(d);
                return Gdk.ContentProvider.new_for_value(gval);
            });
            btn.add_controller(dragSrc);

            btn.connect("clicked", () => {
                this.#setClickedDetail(d, btn);
                // HACK: Fixes no longer draggable after click
                btn.remove_controller(dragSrc);
                btn.add_controller(dragSrc);
            });
            pool.append(btn);
        }

        const vbox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 16,
            margin_top: 16
        });
        vbox.append(curBox);
        vbox.append(pool);
        
        curGroup.add(vbox);
        this.add(curGroup);
    }

    #setDetail(lbl : Gtk.Label, idx : number, detail : Details) : void {
        lbl.label = displayDetail(MOCK_WEATHER, detail, _g, this.#config);

        const arr = this.#config.getDetailsList();
        arr[idx] = detail;
        this.#settings.set_value("details-list", writeGTypeAS(arr));
        this.#settings.apply();
    }

    #setClickedDetail(deet : Details, widget : Gtk.Widget) : void {
        this.#unsetClickedDetail();

        this.#clickedDeet = deet;
        widget.add_css_class("simpleweather-selected");
        this.#clickedWidget = widget;
    }

    #unsetClickedDetail() : void {
        this.#clickedDeet = undefined;
        this.#clickedWidget?.remove_css_class("simpleweather-selected");
        this.#clickedWidget = undefined;
    }
}
