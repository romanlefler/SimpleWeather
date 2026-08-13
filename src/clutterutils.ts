/*
    Copyright 2026 Roman Lefler

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
import Meta from "gi://Meta";

// Widget must have reactive and track_hover true.
export function setPointer(widget : Clutter.Actor) : void {
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
