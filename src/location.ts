
const latlonRegex = /^([0-9]+\.?[0-9]*),([0-9]+\.?[0-9]*)$/;

export class Location {

    /**
     * True if this is the special location "here"
     */
    #isHere : boolean;

    #lat? : number;
    #lon? : number;

    #name? : string;

    private constructor(name? : string, isHere? : boolean, lat? : number, lon? : number) {
        this.#name = name;
        this.#isHere = isHere ?? false;
        this.#lat = lat;
        this.#lon = lon;
    }

    getName() : string {
        return this.#name ?? "My Location";
    }

    getRawName() : string | null {
        return this.#name ?? null;
    }

    getDescription() : string {
        return this.#isHere ? "My Location" : this.getCoordsString();
    }

    isHere() : boolean {
        return this.#isHere;
    }

    lat() : number {
        return this.#lat!;
    }

    lon() : number {
        return this.#lon!;
    }

    getCoordsString() {
        const isNorth = this.#lat! >= 0;
        const isEast = this.#lon! >= 0;
        const lat = isNorth ? "%f N" : "%f S";
        const lon = isEast ? "%f E" : "%f W";
        return `${lat.format(this.#lat?.toLocaleString())} ${lon.format(this.#lon?.toLocaleString())}`;
    }

    toString() {
        const obj : Record<string, any> = {
            name: this.#name
        };
        if(this.#isHere) obj.isHere = true;
        if(this.#lat) {
            obj.lat = this.#lat;
            obj.lon = this.#lon;
        }

        return JSON.stringify(obj);
    }

    static parse(s : string) : Location | null {
        let obj;
        try {
            obj = JSON.parse(s);
        }
        catch(e) {
            return null;
        }

        const containsLat = typeof obj.lat !== "undefined";
        const containsLon = typeof obj.lon !== "undefined";

        // Only here can omit the name
        if(!obj.isHere && !obj.name) return null;
        // isHere must be undefined or bool
        if(typeof obj.isHere !== "undefined" && typeof obj.isHere !== "boolean") return null;
        // lat must be undefined or number
        if(containsLat && typeof obj.lat !== "number") return null;
        // lon must be undefined or number
        if(containsLon && typeof obj.lon !== "number") return null;
        // either neither lat or lon or both lon and lat
        if(containsLat !== containsLon) return null;

        return new Location(
            obj.name ?? undefined,
            obj.isHere,
            obj.lat,
            obj.lon
        );
    }

    static newCoords(name : string, lat : number, lon : number) : Location {
        return new Location(name, false, lat, lon);
    }

    static newHere(name? : string) : Location {
        return new Location(name, true);
    }

}
