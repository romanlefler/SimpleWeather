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
import St from "gi://St";

export function theme(widget : St.Widget, klassName : string) {
    (widget as any).dataSwClass = klassName;
}

export function themeInitAll(parent : Clutter.Actor, theme : string) {
    if(parent instanceof St.Widget) {
        const classStr : string | undefined = (parent as any).dataSwClass;
        const classes = classStr ? classStr.split(" ") : [ ];
        for(const klass of classes) {
            parent.add_style_class_name(`sw-style-${theme}-${klass}`);
        }
    }

    for(const child of parent.get_children()) {
        themeInitAll(child, theme);
    }
}

export function themeRemoveAll(parent : Clutter.Actor) {
    if(parent instanceof St.Widget && parent.style_class) {
        const classes : string[] = parent.style_class.split(" ");
        const removeList : string[] = [ ];
        for(const klass of classes) {
            if(!klass.startsWith("sw-style-")) continue;
            removeList.push(klass);
        }
        for(const c of removeList) parent.remove_style_class_name(c);
    }

    for(const child of parent.get_children()) {
        themeRemoveAll(child);
    }
}
