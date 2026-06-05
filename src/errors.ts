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

export class FriendlyError extends Error {

    constructor(msg? : string) {
        super(msg);
    }

    transl(gettext : ((s : string) => string)) : string {
        return "Override me.";
    }
}

/**
 * Thrown when a unit is unexpected or invalid.
 */
export class UnitError extends Error {

    constructor(msg? : string) {
        super(msg);
        this.name = "UnitError";
    }

}

export class UserInputError extends Error {

    constructor(msg? : string) {
        super(msg);
        this.name = "UserInputError";
    }
}

export class NoLocServiceError extends FriendlyError {

    constructor(msg? : string) {
        super(msg ?? "Location unavailable or permission not granted.");
        this.name = "NoLocServiceError";
    }

    transl(gettext : ((s : string) => string)) : string {
        return gettext("Location unavailable or permission not granted.");
    }

}

export class AutoConfigFailError extends Error {
    constructor(msg? : string) {
        super(msg ?? "Automatic configuration failed.");
        this.name = "AutoConfigFailError";
    }
}

export class ServiceStatusError extends FriendlyError {
    #code : number;

    constructor(code : number) {
        super("Got ${code} (Service is temporarily down.)");
        this.#code = code;
        this.name = "Provider502Error";
    }

    transl(gettext : ((s : string) => string)) : string {
        return gettext("Service down (%s)").format(this.#code.toString());
    }
}

