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

// Access gettext functions from globalThis (GJS runtime)
declare const globalThis: typeof global & {
    bindtextdomain?: (domain: string, location: string) => string;
    textdomain?: (domain: string) => string;
};

let gettextFn : ((str : string) => string) | undefined;
let localeDir : string | undefined;
let domain : string | undefined;

/**
 * Sets the language environment variable to force a specific locale
 * @param languageCode - The language code (e.g., 'pt_BR', 'es_ES', 'en')
 *                       or 'auto' to use system default
 */
export function setLanguage(languageCode: string): void {
    if (languageCode && languageCode !== 'auto') {
        // Set LANGUAGE environment variable to override system locale
        GLib.setenv('LANGUAGE', languageCode, true);
        // Also set LANG to ensure consistency
        GLib.setenv('LANG', `${languageCode}.UTF-8`, true);
        GLib.setenv('LC_MESSAGES', `${languageCode}.UTF-8`, true);
    } else {
        // Reset to system default
        GLib.unsetenv('LANGUAGE');
        GLib.unsetenv('LC_MESSAGES');
    }
    
    // Force gettext to reload by re-binding the text domain
    if (localeDir && domain) {
        try {
            if (globalThis.bindtextdomain && globalThis.textdomain) {
                globalThis.bindtextdomain(domain, localeDir);
                globalThis.textdomain(domain);
            }
        } catch (e) {
            console.warn("Failed to rebind textdomain:", e);
        }
    }
}

/**
 * Sets up the gettext abstraction.
 * Import the correct gettext for the process and pass it into here.
 * @param gettext - The gettext function to use
 * @param textLocaleDir - The directory containing locale files (optional)
 * @param textDomain - The gettext domain name (optional)
 */
export function setUpGettext(
    gettext : (str : string) => string,
    textLocaleDir? : string,
    textDomain? : string
) : void {
    gettextFn = gettext;
    localeDir = textLocaleDir;
    domain = textDomain;
}

/**
 * This is the normal GNU gettext function.
 * This function exists as an abstraction between the two imports for
 * extension.js and prefs.js, so the same code can be used in
 * both processes.
 */
export function gettext(str : string) : string {
    return gettextFn!(str);
}

