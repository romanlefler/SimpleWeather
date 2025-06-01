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
import { TempUnits } from "./units.js";

export class Config {

    #settings? : Gio.Settings;
    #handlerIds : number[];

    constructor(settings : Gio.Settings) {
        this.#settings = settings;
        this.#handlerIds = [ ];
    }

    free() {
        while(this.#handlerIds.length > 0) {
            const id = this.#handlerIds.pop()!;
            this.#settings?.disconnect(id);
        }
        this.#settings = undefined;
    }

    getTempUnit() : TempUnits {
        return this.#settings!.get_enum("temp-unit");
    }

    onTempUnitChanged(callback : () => void) {
        const id = this.#settings!.connect("changed", (_, key) => {
            if(key === "temp-unit") callback();
        });
        this.#handlerIds.push(id);
    }

}
