import Gio from "gi://Gio";

import { setUpGettext } from "../../dist/build/gettext.js";
import {
    DirectionUnits,
    PressureUnits,
    RainMeasurementUnits,
    SpeedUnits,
    TempUnits
} from "../../dist/build/units.js";
import { OpenMeteo } from "../../dist/build/providers/openmeteo.js";
import { OpenWeatherMap3 } from "../../dist/build/providers/openweathermap3.js";
import { QWeather } from "../../dist/build/providers/qweather.js";

setUpGettext(s => s);

const [ providerName, fixturePath ] = ARGV;
const [ success, contents ] = Gio.File.new_for_path(fixturePath).load_contents(null);
if(!success) throw new Error(`Could not load fixture: ${fixturePath}`);

const json = JSON.parse(new TextDecoder().decode(contents));
// Parsing only stores the location on the Weather result. Keep this fixture
// runner independent of Location's runtime geolocation dependencies (such as
// Geoclue), which are not involved in parsing a provider response.
const loc = {
    getName: () => "Test location"
};
const config = {
    getDirectionUnit: () => DirectionUnits.Degrees,
    getRainMeasurementUnit: () => RainMeasurementUnits.In,
    getSpeedUnit: () => SpeedUnits.Mph
};

let weather;
switch(providerName) {
    case "openmeteo":
        weather = new OpenMeteo(null, config).parseWeatherJson(json, loc);
        break;
    case "openweathermap3":
        weather = new OpenWeatherMap3(null, config).parseWeatherJson(json, loc);
        break;
    case "qweather":
        weather = new QWeather(null, config).parseWeatherJson(json, loc);
        break;
    default:
        throw new Error(`Unknown provider: ${providerName}`);
}

function iso(date) {
    return date.toISOString();
}

function conditionText(text) {
    return text?.display(config) ?? null;
}

function forecast(f) {
    return {
        date: iso(f.date),
        gIconName: f.gIconName,
        conditionText: conditionText(f.conditionText),
        temp: f.temp?.get(TempUnits.Fahrenheit) ?? null,
        tempMin: f.tempMin?.get(TempUnits.Fahrenheit) ?? null,
        tempMax: f.tempMax?.get(TempUnits.Fahrenheit) ?? null,
        precipChancePercent: f.precipChancePercent
    };
}

const snapshot = {
    modelKeys: Object.keys(weather).sort(),
    condit: weather.condit,
    tempFahrenheit: weather.temp.get(TempUnits.Fahrenheit),
    gIconName: weather.gIconName,
    isNight: weather.isNight,
    observedAt: iso(weather.observedAt),
    sunrise: iso(weather.sunrise),
    sunset: iso(weather.sunset),
    forecast: weather.forecast.map(forecast),
    hourForecast: weather.hourForecast.map(forecast),
    feelsLikeFahrenheit: weather.feelsLike.get(TempUnits.Fahrenheit),
    windMph: weather.wind.get(SpeedUnits.Mph),
    gustsMph: weather.gusts.get(SpeedUnits.Mph),
    windDirectionDegrees: weather.windDir.get(DirectionUnits.Degrees),
    humidityPercent: weather.humidity.get(),
    pressureInHg: weather.pressure.get(PressureUnits.InHg),
    uvIndex: weather.uvIndex,
    precipitationInches: weather.precipitation.get(RainMeasurementUnits.In),
    precipForecast: weather.precipForecast === undefined ? null : {
        start: iso(weather.precipForecast.start),
        intervalMin: weather.precipForecast.intervalMin,
        inchesPerHour: weather.precipForecast.levels.map(
            level => level.get(RainMeasurementUnits.In)
        )
    },
    providerName: weather.providerName,
    locationName: weather.loc.getName(),
    windSpeedAndDirection: weather.windSpeedAndDir.display(config),
    cloudCoverPercent: weather.cloudCover.get(),
    conditionText: conditionText(weather.conditionText),
    sunEventCountdownType: weather.sunEventCountdown.constructor.name
};

print(JSON.stringify(snapshot));
