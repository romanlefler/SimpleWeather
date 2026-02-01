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
 * Available language information
 */
export interface LanguageInfo {
    code: string;
    name: string;
}

/**
 * List of all available languages in the extension
 * This should match the .po files in the po/ directory
 */
export const AVAILABLE_LANGUAGES: LanguageInfo[] = [
    { code: 'auto', name: 'System Default' },
    { code: 'af', name: 'Afrikaans' },
    { code: 'ar', name: 'العربية (Arabic)' },
    { code: 'bg', name: 'Български (Bulgarian)' },
    { code: 'ca', name: 'Català (Catalan)' },
    { code: 'cs', name: 'Čeština (Czech)' },
    { code: 'da', name: 'Dansk (Danish)' },
    { code: 'de', name: 'Deutsch (German)' },
    { code: 'el', name: 'Ελληνικά (Greek)' },
    { code: 'en', name: 'English' },
    { code: 'es_ES', name: 'Español (Spanish)' },
    { code: 'fi', name: 'Suomi (Finnish)' },
    { code: 'fr', name: 'Français (French)' },
    { code: 'he', name: 'עברית (Hebrew)' },
    { code: 'hu', name: 'Magyar (Hungarian)' },
    { code: 'id', name: 'Bahasa Indonesia (Indonesian)' },
    { code: 'it', name: 'Italiano (Italian)' },
    { code: 'ja', name: '日本語 (Japanese)' },
    { code: 'ko', name: '한국어 (Korean)' },
    { code: 'nl', name: 'Nederlands (Dutch)' },
    { code: 'no', name: 'Norsk (Norwegian)' },
    { code: 'pl', name: 'Polski (Polish)' },
    { code: 'pt_BR', name: 'Português Brasil (Portuguese - Brazil)' },
    { code: 'pt_PT', name: 'Português (Portuguese - Portugal)' },
    { code: 'ro', name: 'Română (Romanian)' },
    { code: 'ru', name: 'Русский (Russian)' },
    { code: 'sr', name: 'Српски (Serbian)' },
    { code: 'sv_SE', name: 'Svenska (Swedish)' },
    { code: 'tr', name: 'Türkçe (Turkish)' },
    { code: 'uk', name: 'Українська (Ukrainian)' },
    { code: 'vi', name: 'Tiếng Việt (Vietnamese)' },
    { code: 'zh_CN', name: '简体中文 (Chinese Simplified)' },
    { code: 'zh_TW', name: '繁體中文 (Chinese Traditional)' }
];

/**
 * Get language info by code
 */
export function getLanguageInfo(code: string): LanguageInfo | undefined {
    return AVAILABLE_LANGUAGES.find(lang => lang.code === code);
}

/**
 * Get the index of a language by its code
 */
export function getLanguageIndex(code: string): number {
    const index = AVAILABLE_LANGUAGES.findIndex(lang => lang.code === code);
    return index >= 0 ? index : 0; // Default to 'auto' if not found
}
