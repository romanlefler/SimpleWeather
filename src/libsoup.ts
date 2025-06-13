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
import Soup from "gi://Soup";

const genericUserAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) " +
    "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.10 Safari/605.1.1";

const realUserAgent = "simple-weather@romanlefler.com";

export interface ServerResponse {
    readonly status : number;
    readonly is2xx : boolean;
    readonly body : any;
}

export class LibSoup {

    #genericSession? : Soup.Session;
    #realUserSession? : Soup.Session;

    constructor() {
        this.#genericSession = new Soup.Session({ user_agent: genericUserAgent });
        this.#realUserSession = new Soup.Session({ user_agent: realUserAgent });
    }

    free() {
        this.#genericSession?.abort();
        this.#genericSession = undefined;
        this.#realUserSession?.abort();
        this.#realUserSession = undefined;
    }

    async fetchJson(url : string, params : Record<string, string>,
        useTrackedAgent = false) : Promise<ServerResponse> {

        const sess = useTrackedAgent ? this.#realUserSession : this.#genericSession;
        if(!sess) throw new Error("Attempt to use LibSoup after freed.");

        const paramsEncoded = Soup.form_encode_hash(params);
        const msg = Soup.Message.new_from_encoded_form("GET", url, paramsEncoded);
        msg.request_headers.append("Accept", "application/json");

        return new Promise((resolve, reject) => {
            sess.send_and_read_async(
                msg,
                GLib.PRIORITY_DEFAULT,
                null,
                (_, result) => {
                    let gBytes : GLib.Bytes;
                    try {
                        gBytes = sess.send_and_read_finish(result);
                    }
                    catch(e) {
                        reject(e);
                        return;
                    }

                    const byteArray = gBytes.get_data();
                    if(!byteArray) return reject("Failed to get byte stream from server response.");
                    

                    const json = new TextDecoder().decode(byteArray);
                    if(!json) return reject("Server response was empty.");

                    const status = msg.statusCode;
                    const is2xx = Math.floor(status / 100) === 2;

                    let body : any;
                    try {
                        body = JSON.parse(json);
                    }
                    catch(e) {
                        if(e instanceof SyntaxError) {
                            reject(new SyntaxError(
                                "Couldn't parse body JSON. " +
                                `User-Agent: ${sess.userAgent}, Status: ${status}, Text: "${json}"`,
                                { cause: e }
                            ));
                        }
                        else return reject(e);
                    }

                    resolve({ status, body, is2xx: is2xx });
                }
            );
        });
    }

}
