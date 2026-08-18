import assert from "node:assert/strict";
import test from "node:test";

import { parseFixture } from "./run-gjs.ts";

test("Open-Meteo parses its JSON response into Weather", () => {
    assert.deepStrictEqual(parseFixture("openmeteo"), {
        modelKeys: [
            "cloudCover", "condit", "conditionText", "feelsLike", "forecast",
            "gIconName", "gusts", "hourForecast", "humidity", "isNight", "loc",
            "observedAt", "precipForecast", "precipitation", "pressure", "providerName",
            "sunEventCountdown", "sunrise", "sunset", "temp", "uvIndex", "wind",
            "windDir", "windSpeedAndDir"
        ],
        condit: "cloudy",
        tempFahrenheit: 72,
        gIconName: "weather-few-clouds",
        isNight: false,
        observedAt: "2099-01-01T12:00:00.000Z",
        sunrise: "2099-01-01T06:00:00.000Z",
        sunset: "2099-01-01T18:00:00.000Z",
        forecast: [
            {
                date: "2099-01-01T00:00:00.000Z", gIconName: "weather-clear",
                conditionText: "Sunny", temp: null, tempMin: 50, tempMax: 70,
                precipChancePercent: 10
            },
            {
                date: "2099-01-02T00:00:00.000Z", gIconName: "weather-showers",
                conditionText: "Rainy", temp: null, tempMin: 51, tempMax: 65,
                precipChancePercent: 80
            }
        ],
        hourForecast: [
            {
                date: "2099-01-01T12:00:00.000Z", gIconName: "weather-few-clouds",
                conditionText: "Cloudy", temp: 72, tempMin: null, tempMax: null,
                precipChancePercent: 20
            },
            {
                date: "2099-01-01T13:00:00.000Z", gIconName: "weather-showers",
                conditionText: "Rainy", temp: 68, tempMin: null, tempMax: null,
                precipChancePercent: 70
            }
        ],
        feelsLikeFahrenheit: 70,
        windMph: 12,
        gustsMph: 20,
        windDirectionDegrees: 225,
        humidityPercent: 55,
        pressureInHg: 29.53,
        uvIndex: 5,
        precipitationInches: 0.1,
        precipForecast: {
            start: "2099-01-01T12:00:00.000Z",
            intervalMin: 15,
            inchesPerHour: [ 0.04, 0.08 ]
        },
        providerName: "Open-Meteo",
        locationName: "Test location",
        windSpeedAndDirection: "225°, 12 mph",
        cloudCoverPercent: 60,
        conditionText: "Cloudy",
        sunEventCountdownType: "Countdown"
    });
});
