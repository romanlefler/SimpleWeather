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
import { getLocales } from "./lang.js";

export function delayTask(seconds : number, callback : () => void) : number {
    return GLib.timeout_add_seconds(
        GLib.PRIORITY_DEFAULT,
        seconds,
        () => {
            callback();
            return GLib.SOURCE_REMOVE;
        }
    );
}

export function removeSourceIfTruthy(id : number | null | undefined) : undefined {
    if(id) GLib.source_remove(id);
    return undefined;
}

export function getTimezoneName() : string {
    return Intl.DateTimeFormat(getLocales()).resolvedOptions().timeZone;
}
