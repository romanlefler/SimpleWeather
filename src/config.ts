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

import GLib from "gi://GLib";
import Gio from "gi://Gio";
import { DirectionUnits, DistanceUnits, PressureUnits, RainMeasurementUnits, SpeedUnits, TempUnits } from "./units.js";
import { Location } from "./location.js";
import { MyLocationProvider } from "./myLocation.js";
import { WeatherProviderKeys } from "./providers/provider.js";
import { Details } from "./details.js";

export enum UnitPreset {
    Custom = 0,
    US = 1,
    UK = 2,
    Metric = 3,
    Nordic = 4
}

export enum PopupLayout {
    Default = 0,
    Classic = 1
}

export enum SearchProvider {
    Nominatim,
    QWeather,
    OpenMeteo
}

export type PanelBox = "right" | "center" | "left";
export interface PanelPosition {
    box: PanelBox;
    priority: number;
}

export class Config {

    #systemSettings : Gio.Settings | null;
    #settings : Gio.Settings;

    #handlerIds : number[];
    #sysHandlerIds : number[];

    /**
     * Using this wrapper allows for easy logging if needed (i.e. to see which method gave which handlerId).
     */
    #addId(handlerId : number) {
        // console.trace(`Added handler ${handlerId}.`);
        this.#handlerIds.push(handlerId);
    }

    #addSysId(handlerId : number) {
        // console.trace(`Added handler ${handlerId}.`);
        this.#sysHandlerIds.push(handlerId);
    }

    constructor(settings : Gio.Settings, systemSettings : Gio.Settings | null = null) {
        this.#systemSettings = systemSettings;
        this.#settings = settings;
        this.#handlerIds = [ ];
        this.#sysHandlerIds = [ ];
    }

    free() {
        while(this.#handlerIds.length > 0) {
            const id = this.#handlerIds.pop()!;
            this.#settings?.disconnect(id);
        }

        while(this.#sysHandlerIds.length > 0) {
            const id = this.#sysHandlerIds.pop()!;
            this.#systemSettings?.disconnect(id);
        }

        // @ts-ignore
        this.#settings = undefined;
    }

    getTempUnit() : TempUnits {
        return this.#returnUnit(
            "temp-unit",
            { us: TempUnits.Fahrenheit, metric: TempUnits.Celsius }
        );
    }

    onTempUnitChanged(callback : () => void) {
        const id = this.#settings.connect("changed", (_, key) => {
            if(key === "temp-unit" || key === "unit-preset") callback();
        });
        this.#addId(id);
    }

    getLocations() : Location[] {
        const gVariant = this.#settings.get_value("locations");
        const stringArr = readGTypeAS(gVariant);
        const locArr = stringArr.map(k => Location.parse(k));

        const filtered = locArr.filter(l => l !== null) as Location[];
        if(filtered.length === 0) {
            const newLoc = Location.newHere();
            filtered.push(newLoc);
        }
        return filtered;
    }

    onLocationsChanged(callback : () => void) {
        const id = this.#settings.connect("changed", (_, key) => {
            if(key === "locations") callback();
        });
        this.#addId(id);
    }

    getMainLocation() : Location {
        const inx = this.#settings.get_int64("main-location-index");
        const arr = this.getLocations();
        return arr[inx] ?? arr[0];
    }

    onMainLocationChanged(callback : () => void) {
        // Using change-event instead of changed makes sure
        // that the callback isn't double-fired since either
        // key causes a change
        const id = this.#settings.connect("change-event", (_, quarks) => {
            // Returning false continues to call changed events
            if(!quarks) return false;

            for(let q of quarks) {
                const s = GLib.quark_to_string(q);
                if(s === "locations" || s === "main-location-index") {
                    callback();
                    return false;
                }
            }

            return false;
        });
        this.#addId(id);
    }

    getMainLocationIndex() : number {
        return this.#settings.get_int64("main-location-index");
    }

    onMainLocationIndexChanged(callback : () => void) {
        const id = this.#settings.connect("changed", (_, key) => {
            if(key === "main-location-index") callback();
        });
        this.#addId(id);
    }

    getMyLocationProvider() : MyLocationProvider {
        const val = this.#settings.get_enum("my-loc-provider");
        if(val > 5 || val < 1) return 1;
        else return val;
    }

    onMyLocationProviderChanged(callback : () => void) {
        const id = this.#settings.connect("changed", (_, key) => {
            if(key === "my-loc-provider") callback();
        });
        this.#addId(id);
    }

    getMyLocationRefreshMin() : number {
        const val = this.#settings.get_double("my-loc-refresh-min");
        if(val < 10.0) return 10.0;
        else return val;
    }

    getDontCheckLocales() : boolean {
        return this.#settings.get_boolean("dont-check-locales");
    }

    getWeatherProvider() : number {
        const val = this.#settings.get_enum("weather-provider");
        if(val < 1 || val > WeatherProviderKeys.length) return 1;
        else return val;
    }

    onWeatherProviderChanged(callback : () => void) {
        const id = this.#settings.connect("changed", (_, key) => {
            if(key === "weather-provider") callback();
        });
        this.#addId(id);
    }

    getSearchProvider() : SearchProvider {
        const val = this.#settings.get_enum("search-provider");
        if(val < SearchProvider.Nominatim || val > SearchProvider.OpenMeteo) {
            return SearchProvider.Nominatim;
        }
        return val;
    }

    onSearchProviderChanged(callback : () => void) {
        const id = this.#settings.connect("changed", (_, key) => {
            if(key === "search-provider") callback();
        });
        this.#addId(id);
    }

    getSpeedUnit() : SpeedUnits {
        return this.#returnUnit(
            "speed-unit",
            {
                us: SpeedUnits.Mph,
                uk: SpeedUnits.Mph,
                metric: SpeedUnits.Kph,
                nordic: SpeedUnits.Mps
            }
        );
    }

    onSpeedUnitChanged(callback : () => void) {
        const id = this.#settings.connect("changed", (_, key) => {
            if(key === "speed-unit" || key === "unit-preset") callback();
        });
        this.#addId(id);
    }

    getDirectionUnit(): DirectionUnits {
        return this.#settings.get_enum("direction-unit");
    }

    onDirectionUnitChanged(callback : () => void) {
        const id = this.#settings.connect("changed", (_, key) => {
            if(key === "direction-unit" || key === "unit-preset") callback();
        });
        this.#addId(id);
    }

    getPressureUnit() : PressureUnits {
        return this.#returnUnit(
            "pressure-unit",
            { us: PressureUnits.InHg, metric: PressureUnits.HPa }
        );
    }

    onPressureUnitChanged(callback : () => void) {
        const id = this.#settings.connect("changed", (_, key) => {
            if(key === "pressure-unit" || key === "unit-preset") callback();
        });
        this.#addId(id);
    }

    getRainMeasurementUnit() : RainMeasurementUnits {
        return this.#returnUnit(
            "rain-measurement-unit",
            { us: RainMeasurementUnits.In, metric: RainMeasurementUnits.Mm }
        );
    }

    onRainMeasurementUnitChanged(callback : () => void) {
        const id = this.#settings.connect("changed", (_, key) => {
            if(key === "rain-measurement-unit" || key === "unit-preset") callback();
        });
        this.#addId(id);
    }

    getDistanceUnit() : DistanceUnits {
        return this.#returnUnit(
            "distance-unit",
            { us: DistanceUnits.Mi, uk: DistanceUnits.Mi, metric: DistanceUnits.Km }
        );
    }

    onDistanceUnitChanged(callback : () => void) {
        const id = this.#settings.connect("changed", (_, key) => {
            if(key === "distance-unit" || key === "unit-preset") callback();
        });
        this.#addId(id);
    }

    getHighContrast() : boolean {
        return this.#settings.get_boolean("high-contrast");
    }

    onHighContrastChanged(callback : () => void) {
        const id = this.#settings.connect("changed", (_, key) => {
            if(key === "high-contrast") callback();
        });
        this.#addId(id);
    }

    getShowSunTime() : boolean {
        return this.#settings.get_boolean("show-suntime");
    }

    onShowSunTimeChanged(callback : (val : boolean) => void) {
        const id = this.#settings.connect("changed", (_, key) => {
            if(key === "show-suntime") {
                callback(this.#settings.get_boolean("show-suntime"));
            }
        });
        this.#addId(id);
    }

    getShowSunTimeAsCountdown() : boolean {
        return this.#settings.get_boolean("show-suntime-as-countdown");
    }

    onShowSunTimeAsCountdownChanged(callback : (val : boolean) => void) {
        const id = this.#settings.connect("changed", (_, key) => {
            if(key === "show-suntime-as-countdown") {
                callback(this.#settings.get_boolean("show-suntime-as-countdown"));
            }
        });
        this.#addId(id);
    }

    getSecondaryPanelDetail() : Details | null {
        const detail = this.#settings.get_string("secondary-panel-detail");
        if(!Object.values(Details).includes(detail as Details)) return null;
        else return detail as Details;
    }

    onSecondaryPanelDetailChanged(callback : () => void) : void {
        const id = this.#settings.connect("changed", (_, key) => {
            if(key === "secondary-panel-detail") callback();
        });
        this.#addId(id);
    }

    getShowPanelIcon() : boolean {
        return this.#settings.get_boolean("show-panel-icon");
    }

    onShowPanelIconChanged(callback : () => void) : void {
        const id = this.#settings.connect("changed", (_, key) => {
            if(key === "show-panel-icon") callback();
        });
        this.#addId(id);
    }

    is24HourClock() : boolean | null {
        if(!this.#systemSettings) return null;
        return this.#systemSettings.get_enum("clock-format") === 0;
    }

    onIs24HourClockChanged(callback : () => void) : void {
        if(!this.#systemSettings) return;
        const id = this.#systemSettings.connect("changed", (_, key) => {
            if(key === "clock-format") callback();
        });
        this.#addSysId(id);
    }

    /**
     * Gets the details list.
     * Items are not sanitized and may not be in Details.
     * @returns Between zero and the number of available detail types.
     */
    getDetailsList() : string[] {
        return this.getFeaturedDetailsList(PopupLayout.Default);
    }

    onDetailsListChanged(callback : () => void) : void {
        const id = this.#settings.connect("changed", (_, key) => {
            if(key === "details-list") {
                callback();
            }
        });
        this.#addId(id);
    }

    /**
     * Gets the details shown by the Classic layout.
     * Items are not sanitized and may not be in Details.
     * @returns Between zero and the number of available detail types.
     */
    getClassicDetailsList() : string[] {
        return this.getFeaturedDetailsList(PopupLayout.Classic);
    }

    onClassicDetailsListChanged(callback : () => void) : void {
        const id = this.#settings.connect("changed", (_, key) => {
            if(key === "classic-details-list") callback();
        });
        this.#addId(id);
    }

    getHighlightDetailValues() : boolean {
        return this.#settings.get_boolean("highlight-detail-values");
    }

    onHighlightDetailValuesChanged(callback : () => void) : void {
        const id = this.#settings.connect("changed", (_, key) => {
            if(key === "highlight-detail-values") callback();
        });
        this.#addId(id);
    }

    /**
     * Gets the variable-length details selection edited in preferences.
     * An empty list is valid; a list cannot exceed the number of detail types.
     */
    getFeaturedDetailsList(layout : PopupLayout) : string[] {
        const key = layout === PopupLayout.Classic
            ? "classic-details-list"
            : "details-list";
        const details = readGTypeAS(this.#settings.get_value(key));
        if(details.length <= Object.values(Details).length) return details;

        const defaultValue = this.#settings.get_default_value(key);
        return defaultValue ? readGTypeAS(defaultValue) : [];
    }

    getPanelPosition() : PanelPosition {
        const boxNum = this.#settings.get_enum("panel-box");
        const box = (["right", "center", "left"])[boxNum] ?? "right";
        const priority = this.#settings.get_int64("panel-priority");
        return {
            box: box as PanelBox,
            priority
        };
    }

    onPanelPositionChanged(callback : () => void) : void {
        const id = this.#settings.connect("changed", (_, key) => {
            if(key === "panel-box" || key === "panel-priority") callback();
        });
        this.#addId(id);
    }

    getPanelOffset() : number {
        return this.#settings.get_double("panel-offset") / 100;
    }

    onPanelOffsetChanged(callback : () => void) : void {
        const id = this.#settings.connect("changed", (_, key) => {
            if(key === "panel-offset") callback();
        });
        this.#addId(id);
    }

    getPanelDetail() : Details | null {
        const detail = this.#settings.get_string("panel-detail");
        if(!Object.values(Details).includes(detail as Details)) return null;
        else return detail as Details;
    }

    onPanelDetailChanged(callback : () => void) : void {
        const id = this.#settings.connect("changed", (_, key) => {
            if(key === "panel-detail") callback();
        });
        this.#addId(id);
    }

    getTheme() : string {
        return this.#settings.get_string("theme");
    }

    onThemeChanged(callback : () => void) : void {
        const id = this.#settings.connect("changed", (_, key) => {
            if(key === "theme") callback();
        });
        this.#addId(id);
    }

    getSymbolicIcons() : boolean {
        return this.#settings.get_boolean("symbolic-icons-panel");
    }

    onSymbolicIconsChanged(callback : () => void) : void {
        const id = this.#settings.connect("changed", (_, key) => {
            if(key === "symbolic-icons-panel") callback();
        });
        this.#addId(id);
    }

    getAlwaysPackagedIcons() : boolean {
        return this.#settings.get_boolean("always-packaged-icons");
    }

    onAlwaysPackagedIconsChanged(callback : () => void) : void {
        const id = this.#settings.connect("changed", (_, key) => {
            if(key === "always-packaged-icons") callback();
        });
        this.#addId(id);
    }

    getHideErrPopup() : boolean {
        return this.#settings.get_boolean("hide-err-popup");
    }

    getShowRefreshButton() : boolean {
        return this.#settings.get_boolean("show-refresh-button");
    }

    onShowRefreshButtonChanged(callback : () => void) : void {
        const id = this.#settings.connect("changed", (_, key) => {
            if(key === "show-refresh-button") callback();
        });
        this.#addId(id);
    }

    getPopupLayout() : PopupLayout {
        const layout = this.#settings.get_enum("popup-layout");
        if(layout < PopupLayout.Default || layout > PopupLayout.Classic) {
            return PopupLayout.Default;
        }
        return layout;
    }

    onPopupLayoutChanged(callback : (layout : PopupLayout) => void) : void {
        const id = this.#settings.connect("changed", (_, key) => {
            if(key === "popup-layout") callback(this.getPopupLayout());
        });
        this.#addId(id);
    }

    /**
     * Gets the API keys map. The key is the index of the provider and the value is the API key.
     * The map will not be NULL or undefined, but each provider is not guaranteed to be present.
     */
    getApiKeys() : Map<string, string> {
        const gval = this.#settings.get_value("api-keys");
        return readGTypeABSS(gval);
    }

    onApiKeysChanged(callback : () => void) : void {
        const id = this.#settings.connect("changed", (_, key) => {
            if(key === "api-keys") callback();
        });
        this.#addId(id);
    }

    /**
     * Gets the API hosts map. The key is the name of the provider and the value is the API host.
     * The map will not be NULL or undefined, but each provider is not guaranteed to be present.
     */
    getApiHosts() : Map<string, string> {
        const gval = this.#settings.get_value("api-hosts");
        return readGTypeABSS(gval);
    }

    onApiHostsChanged(callback : () => void) : void {
        const id = this.#settings.connect("changed", (_, key) => {
            if(key === "api-hosts") callback();
        });
        this.#addId(id);
    }


    getUnitPreset() : UnitPreset {
        return this.#settings.get_enum("unit-preset");
    }

    onAnyUnitChanged(callback : () => void) {
        const id = this.#settings.connect("changed", (_, key) => {
            const unitKeys = [
                "unit-preset", "temp-unit", "speed-unit", "pressure-unit",
                "rain-measurement-unit", "distance-unit", "direction-unit"
             ];
             if(unitKeys.includes(key)) callback();
        });
        this.#addId(id);
    }

    /**
     * Shorthand for checking unit presets and outputting appropriate value,
     * or otherwise checking settings via get_enum for a number.
     *
     * args.us Unit for US preset
     *
     * args.uk Unit for UK preset. If not specified falls back to metric.
     *
     * args.metric Unit for Metric preset
     * 
     * @param getEnumKey Backup get_enum string key
     */
    #returnUnit(getEnumKey : string, args : { us? : number, uk? : number, metric? : number, nordic? : number }) : number {
        const preset = this.getUnitPreset();
        switch(preset) {
            case UnitPreset.US:
                if(args.us !== undefined) return args.us;
                else break;
            case UnitPreset.UK:
                if(args.uk !== undefined) return args.uk;
                // Fall back to metric.
                if(args.metric !== undefined) return args.metric;
                else break;
            case UnitPreset.Metric:
                if(args.metric !== undefined) return args.metric;
                else break;
            case UnitPreset.Nordic:
                if(args.nordic !== undefined) return args.nordic;
                // Fall back to metric.
                if(args.metric !== undefined) return args.metric;
                else break;
        }
        return this.#settings.get_enum(getEnumKey);
    }
}

/**
 * Reads a GVariant of type "as" and returns a string array.
 */
function readGTypeAS(gvariant : GLib.Variant<any>) : string[] {
    const len = gvariant.n_children();

    const arr : string[] = [];
    for (let i = 0; i < len; i++) {
        const gString = gvariant.get_child_value(i);
        const s = gString.get_string()[0];
        arr.push(s);
    }

    return arr;
}

/**
 * Writes a string array into a GVariant of type "as".
 */
export function writeGTypeAS(arr : string[]) : GLib.Variant<any> {
    const gVariantArr = [ ];
    for(let k of arr) {
        const gv = GLib.Variant.new_string(k);
        gVariantArr.push(gv);
    }
    return GLib.Variant.new_array(
        new GLib.VariantType("s"),
        gVariantArr
    );
}

/**
 * Reads a GVariant of type "a{ss}" and returns a Map<string, string>.
 */
export function readGTypeABSS(gvariant : GLib.Variant<any>) : Map<string, string>
{
    const len = gvariant.n_children();

    const map = new Map<string, string>();
    for (let i = 0; i < len; i++)
    {
        const gEntry = gvariant.get_child_value(i);

        const gKey = gEntry.get_child_value(0);
        const gValue = gEntry.get_child_value(1);

        const key = gKey.get_string()[0];
        const value = gValue.get_string()[0];

        map.set(key, value);
    }

    return map;
}

/**
 * Writes a Map<string, string> into a GVariant of type "a{ss}".
 */
export function writeGTypeABSS(map : Map<string, string>) : GLib.Variant<any>
{
    const gVariantEntries : GLib.Variant<any>[] = [];

    for (const [key, value] of map)
    {
        const gKey = GLib.Variant.new_string(key);
        const gValue = GLib.Variant.new_string(value);

        const gEntry = GLib.Variant.new_dict_entry(gKey, gValue);
        gVariantEntries.push(gEntry);
    }

    return GLib.Variant.new_array(
        new GLib.VariantType("{ss}"),
        gVariantEntries
    );
}
