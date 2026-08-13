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
import { gettext as _g } from "../gettext.js";
import { detailName, Details, displayDetail } from "../details.js";
import { Condition, Weather, gettextCondit } from "../weather.js";
import { Direction, Percentage, Pressure, RainMeasurement, Speed, SpeedAndDir, Temp, Countdown } from "../units.js";
import { Location } from "../location.js";
import { Config, PopupLayout, writeGTypeAS } from "../config.js";

function fromTime(hr : number, day : Date | null = null) : Date {
    if(day === null) day = new Date();
    const d = new Date(day);
    d.setHours(hr, 0, 0, 0);
    if(new Date() > d) {
        const dt = new Date();
        dt.setDate(day.getDate() + 1);
        return fromTime(hr, dt);
    } else return d;
}

const MOCK_WEATHER : Weather = {
    condit: Condition.CLEAR,
    temp: new Temp(71),
    gIconName: "weather-clear-symbolic",
    isNight: false,
    observedAt: new Date(),
    sunset: fromTime(12 + 8),
    sunrise: fromTime(6),
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
    cloudCover: new Percentage(44),
    conditionText: gettextCondit(Condition.CLEAR, false),
    sunEventCountdown: new Countdown(fromTime(6))
};

const CLASSIC_DETAILS_DEFAULT = [
    Details.FEELS_LIKE,
    Details.HUMIDITY,
    Details.PRESSURE,
    Details.WIND_SPEED_AND_DIR,
    Details.GUSTS
];

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
        this.#config = new Config(settings);

        const popupGroup = new Adw.PreferencesGroup({
            title: _g("Pop-Up")
        });
        const themes = [
            "",
            "light",
            "afterdark",
            "immersive"
        ];
        const themeModel = new Gtk.StringList({ strings: [
            _g("System"),
            _g("Light"),
            _g("Afterdark"),
            _g("Immersive")
        ]});
        const themeRow = new Adw.ComboRow({
            title: _g("Theme"),
            model: themeModel,
            selected: Math.max(themes.indexOf(settings.get_string("theme")), 0)
        });
        themeRow.connect("notify::selected", (row : Adw.ComboRow) => {
            settings.set_string("theme", themes[row.selected]);
            settings.apply();
        });
        popupGroup.add(themeRow);

        const popupLayoutModel = new Gtk.StringList({ strings: [
            _g("Default"),
            _g("Classic")
        ]});
        const popupLayoutRow = new Adw.ComboRow({
            title: _g("Layout"),
            model: popupLayoutModel,
            selected: settings.get_enum("popup-layout")
        });
        popupLayoutRow.connect("notify::selected", () => {
            settings.set_enum("popup-layout", popupLayoutRow.selected);
            settings.apply();
        });
        popupGroup.add(popupLayoutRow);
        this.add(popupGroup);

        const curGroup = new Adw.PreferencesGroup({
            title: _g("Featured Details"),
            description: _g("Drag-and-drop from bottom to configure the pop-up")
        });

        const stringFmt = Gdk.ContentFormats.new_for_gtype(GObject.TYPE_STRING);

        // Selected
        const curBox = new Gtk.FlowBox({
            orientation: Gtk.Orientation.HORIZONTAL,
            selection_mode: Gtk.SelectionMode.NONE
        });
        const selectedChildren : Gtk.FlowBoxChild[] = [];
        const selectedLabels : Gtk.Label[] = [];
        for(let i = 0; i < 8; i++) {
            const selection = new Gtk.Frame({
                receives_default: true,
                can_focus: true
            });
            const selLabel = new Gtk.Label();
            selection.child = selLabel;
            selectedLabels.push(selLabel);

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
            const child = curBox.get_child_at_index(i);
            if(child) selectedChildren.push(child);
        }

        const updateSelectedCount = (layout : PopupLayout) => {
            const count = layout === PopupLayout.Classic ? 5 : 8;
            const details = this.#getPopupDetails(layout);
            selectedChildren.forEach((child, index) => {
                child.visible = index < count;
                if(index >= count) return;

                let detail = details[index] as Details;
                if(!Object.values(Details).includes(detail)) detail = "invalid" as Details;
                selectedLabels[index].label = displayDetail(
                    MOCK_WEATHER,
                    detail,
                    _g,
                    this.#config
                );
            });
        };
        updateSelectedCount(this.#config.getPopupLayout());
        this.#config.onPopupLayoutChanged(updateSelectedCount);

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


        const panelGroup = new Adw.PreferencesGroup({
            title: _g("Panel")
        });
        const detailsArr = Object.values(Details);
        const detailsNames = [ _g("None") ];
        for(let d of detailsArr) {
            detailsNames.push(_g(detailName[d] as string));
        }
        detailsArr.unshift("" as Details);

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

            if(widget.selected === 0 && secondPanelDetailRow.selected !== 0) {
                widget.selected = secondPanelDetailRow.selected;
                secondPanelDetailRow.selected = 0;
            }
            secondPanelDetailRow.sensitive = widget.selected !== 0;
        });
        panelGroup.add(panelDetailRow);

        const secondPanelDetailSel = detailsArr.indexOf(this.#settings.get_string("secondary-panel-detail") as Details);
        const secondPanelDetailRow = new Adw.ComboRow({
            title: _g("Secondary Panel Detail"),
            model: detailsModel,
            selected: Math.max(0, secondPanelDetailSel),
            sensitive: panelDetailSel !== 0
        });
        secondPanelDetailRow.connect("notify::selected", (widget : Adw.ComboRow) => {
            settings.set_string("secondary-panel-detail", detailsArr[widget.selected]);
            settings.apply();
        });
        panelGroup.add(secondPanelDetailRow);

        const showIconRow = new Adw.SwitchRow({
            title: _g("Show Condition Icon"),
            active: settings.get_boolean("show-panel-icon")
        });
        showIconRow.connect("notify::active", () => {
            settings.set_boolean("show-panel-icon", showIconRow.active);
            settings.apply();
        });
        panelGroup.add(showIconRow);

        const showSunTimeRow = new Adw.SwitchRow({
            title: _g("Show Sunrise/Sunset"),
            active: settings.get_boolean("show-suntime")
        });
        showSunTimeRow.connect("notify::active", () => {
            settings.set_boolean("show-suntime", showSunTimeRow.active);
            settings.apply();
            asCountdownRow.sensitive = showSunTimeRow.active;
        });
        panelGroup.add(showSunTimeRow);

        const asCountdownRow = new Adw.SwitchRow({
            title: _g("Use Countdown for Sun"),
            active: settings.get_boolean("show-suntime-as-countdown"),
            sensitive: settings.get_boolean("show-suntime")
        });
        asCountdownRow.connect("notify::active", () => {
            settings.set_boolean("show-suntime-as-countdown", asCountdownRow.active);
            settings.apply();
        });
        panelGroup.add(asCountdownRow);

        this.add(panelGroup);
    }

    #setDetail(lbl : Gtk.Label, idx : number, detail : Details) : void {
        lbl.label = displayDetail(MOCK_WEATHER, detail, _g, this.#config);

        const layout = this.#config.getPopupLayout();
        const arr = this.#getPopupDetails(layout);
        arr[idx] = detail;
        const key = layout === PopupLayout.Classic ? "classic-details-list" : "details-list";
        this.#settings.set_value(key, writeGTypeAS(arr));
        this.#settings.apply();
    }

    #getPopupDetails(layout : PopupLayout) : string[] {
        if(layout === PopupLayout.Default) return this.#config.getDetailsList();

        const details = this.#settings.get_strv("classic-details-list");
        return details.length === CLASSIC_DETAILS_DEFAULT.length
            ? details
            : [...CLASSIC_DETAILS_DEFAULT];
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
