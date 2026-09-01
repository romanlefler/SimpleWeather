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

import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import St from 'gi://St';
import { theme } from "./theme.js";

export class CarouselBox extends St.BoxLayout {

    static {
        GObject.registerClass(this);
    }

    #page : number;

    readonly #pageCount : number;
    readonly #callbacks : ((page : number) => void)[] = [ ];

    readonly #dots : St.Widget[];
    readonly #indicRow : St.BoxLayout;

    constructor(child : St.Widget, pageCount : number, a : Partial<St.BoxLayout.ConstructorProps> = { }) {
        super({
            x_expand: true,
            y_expand: false,
            ...a,
            vertical: true,
            reactive: true,
            style_class: (a.style_class ?? "") + " sw-carousel"
        })

        this.#indicRow = new St.BoxLayout({
            x_expand: true,
            x_align: Clutter.ActorAlign.CENTER,
            style_class: 'sw-carousel-indic',
        });

        this.add_child(child);

        this.#page = 0;
        this.#pageCount = pageCount;
        this.#dots = new Array(pageCount);

        for(let i = 0; i < pageCount; i++) {
            const dot = new St.Widget({
                x_align: Clutter.ActorAlign.CENTER,
                style_class: "sw-carousel-dot"
            });
            const slot = new St.Bin({
                child: dot,
                style_class: "sw-carousel-dot-slot"
            });
            theme(dot, "carousel-dot");
            this.#dots[i] = dot;
            this.#indicRow.add_child(slot);
        }
        this.add_child(this.#indicRow);
        this.#updateDots();
    }

    #updateDots() {
        for(let i = 0; i < this.#pageCount; i++) {
            if(i == this.#page) this.#dots[i].add_style_class_name("sw-active");
            else this.#dots[i].remove_style_class_name("sw-active");
        }
    }

    onPageChanged(callback : (page : number) => void) : void {
        this.#callbacks.push(callback);
        this.connect("button-press-event", () => {
            this.#page = (this.#page + 1) % this.#pageCount;
            this.#updateDots();
            callback(this.#page);
            return Clutter.EVENT_STOP;
        });
    }

    setPage(page : number, callCallbacks : boolean = true) : void {
        if(page < 0 || page >= this.#pageCount) throw new RangeError("Page out of range");
        this.#page = page;
        this.#updateDots();

        if(callCallbacks) {
            for(const c of this.#callbacks) c(page);
        }
    }

    get page() : number { return this.#page; }
    get pageCount() : number { return this.#pageCount; }
}
