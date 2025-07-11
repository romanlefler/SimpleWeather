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

export class NoLocServiceError extends Error {

    constructor(msg? : string) {
        super(msg);
        this.name = "NoLocServiceError";
    }

}
