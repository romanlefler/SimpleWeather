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

import Gio from "gi://Gio";

export const Icons = {
    Clear: "clear",
    Cloudy: "few-clouds",
    Foggy: "fog",
    FreezingRain: "freezing-rain",
    FreezingStorm: "freezing-storm",
    Hail: "snow",
    Overcast: "overcast",
    Misty: "fog",
    Rainy: "showers",
    RainScattered: "showers-scattered",
    Snowy: "snow",
    Stormy: "storm",
    Windy: "windy",
    Tornado: "tornado"
};

const THEMED_ICON_FALLBACKS : Record<string, string[]> = {
    "weather-freezing-rain": [ "weather-showers" ],
    "weather-freezing-storm": [ "weather-storm" ],
    "weather-tornado": [ "weather-severe-alert" ],
    "weather-windy": [ "weather-few-clouds" ]
};

interface WeatherIconOptions {
    symbolic? : boolean;
    packaged? : boolean;
}

function iconHasNightVariant(name: string) {
    return name === "clear" || name === "few-clouds";
}

export function getGIconName(name: string, isNight: boolean): string {
    let fullName = "weather-" + name;

    if (isNight && iconHasNightVariant(name)) fullName += "-night";
    return fullName;
}

function packagedIcon(extensionPath: string, name: string) : Gio.Icon {
    const iconPath = `${extensionPath}/icons/${name}-symbolic.svg`;
    const iconFile = Gio.File.new_for_path(iconPath);
    return new Gio.FileIcon({ file: iconFile });
}

export function getWeatherGIcon(
    name: string,
    extensionPath: string,
    opts: WeatherIconOptions = {}
) : Gio.Icon {
    const { symbolic = false, packaged = false } = opts;

    if (packaged) return packagedIcon(extensionPath, name);

    const names = [ name, ...(THEMED_ICON_FALLBACKS[name] ?? []) ];
    const themedNames = symbolic
        ? names.map(iconName => `${iconName}-symbolic`)
        : names;

    return Gio.ThemedIcon.new_from_names(themedNames);
}
