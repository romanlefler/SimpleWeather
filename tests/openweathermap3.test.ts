import assert from "node:assert/strict";
import test from "node:test";

import { parseFixture } from "./run-gjs.ts";

test("OpenWeatherMap 3.0 parses its JSON response into Weather", () => {
    assert.deepStrictEqual(parseFixture("openweathermap3"), {
        modelKeys: [
            "cloudCover", "condit", "conditionText", "feelsLike", "forecast",
            "gIconName", "gusts", "hourForecast", "humidity", "isNight", "loc",
            "observedAt", "precipForecast", "precipitation", "pressure", "providerName",
            "sunEventCountdown", "sunrise", "sunset", "temp", "uvIndex", "wind",
            "windDir", "windSpeedAndDir"
        ],
        condit: "clear",
        tempFahrenheit: 72,
        gIconName: "weather-clear",
        isNight: false,
        observedAt: "2099-01-01T12:00:00.000Z",
        sunrise: "2099-01-01T06:00:00.000Z",
        sunset: "2099-01-01T18:00:00.000Z",
        forecast: [
            {
                date: "2099-01-01T12:00:00.000Z", gIconName: "weather-snow",
                conditionText: "Snowy", temp: null, tempMin: 50, tempMax: 70,
                precipChancePercent: 10
            },
            {
                date: "2099-01-02T12:00:00.000Z", gIconName: "weather-showers-scattered",
                conditionText: "Rainy", temp: null, tempMin: 51, tempMax: 65,
                precipChancePercent: 80
            }
        ],
        hourForecast: [
            {
                date: "2099-01-01T12:00:00.000Z", gIconName: "weather-clear",
                conditionText: "Sunny", temp: 72, tempMin: null, tempMax: null,
                precipChancePercent: 20
            },
            {
                date: "2099-01-01T13:00:00.000Z", gIconName: "weather-few-clouds-night",
                conditionText: "Cloudy", temp: 68, tempMin: null, tempMax: null,
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
        precipitationInches: 1.0000005399999998,
        precipForecast: {
            start: "2099-01-01T12:00:00.000Z",
            intervalMin: 1,
            inchesPerHour: [ 0.0100000054, 0.0200000108 ]
        },
        providerName: "OpenWeatherMap 3.0",
        locationName: "Test location",
        windSpeedAndDirection: "225°, 12 mph",
        cloudCoverPercent: 10,
        conditionText: "Sunny",
        sunEventCountdownType: "Countdown"
    });
});
