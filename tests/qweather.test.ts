import assert from "node:assert/strict";
import test from "node:test";

import { parseFixture } from "./run-gjs.ts";

test("QWeather parses its JSON responses into Weather", () => {
    assert.deepStrictEqual(parseFixture("qweather"), {
        modelKeys: [
            "cloudCover", "condit", "conditionText", "feelsLike", "forecast",
            "gIconName", "gusts", "hourForecast", "humidity", "isNight", "loc",
            "observedAt", "precipitation", "pressure", "providerName", "sunEventCountdown",
            "sunrise", "sunset", "temp", "uvIndex", "wind", "windDir", "windSpeedAndDir"
        ],
        condit: "clear",
        tempFahrenheit: 68,
        gIconName: "weather-clear-night",
        isNight: true,
        observedAt: "2099-01-01T05:00:00.000Z",
        sunrise: "2099-01-01T06:00:00.000Z",
        sunset: "2099-01-01T18:00:00.000Z",
        forecast: [
            {
                date: "2099-01-01T00:00:00.000Z", gIconName: "weather-few-clouds",
                conditionText: "Cloudy", temp: null, tempMin: 50, tempMax: 68,
                precipChancePercent: 20
            },
            {
                date: "2099-01-02T00:00:00.000Z", gIconName: "weather-snow",
                conditionText: "Snowy", temp: null, tempMin: 41, tempMax: 59,
                precipChancePercent: 80
            }
        ],
        hourForecast: [
            {
                date: "2099-01-01T05:00:00.000Z", gIconName: "weather-clear-night",
                conditionText: "Clear", temp: 68, tempMin: null, tempMax: null,
                precipChancePercent: 10
            },
            {
                date: "2099-01-01T13:00:00.000Z", gIconName: "weather-showers-scattered",
                conditionText: "Rainy", temp: 69.8, tempMin: null, tempMax: null,
                precipChancePercent: 70
            }
        ],
        feelsLikeFahrenheit: 64.4,
        windMph: 1,
        gustsMph: 2,
        windDirectionDegrees: 270,
        humidityPercent: 65,
        pressureInHg: 29.53,
        uvIndex: 4,
        precipitationInches: 1.0000005399999998,
        precipForecast: null,
        providerName: "QWeather",
        locationName: "Test location",
        windSpeedAndDirection: "270°, 1 mph",
        cloudCoverPercent: 25,
        conditionText: "Clear",
        sunEventCountdownType: "Countdown"
    });
});
