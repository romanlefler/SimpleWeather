# SimpleWeather

A highly configurable weather extension for GNOME Shell, with hourly and
weekly forecasts, multiple locations, customizable weather details, and
multiple providers.

[![GNOME Extensions](https://img.shields.io/badge/GNOME_Extensions-Install-4A86CF?logo=gnome&logoColor=white)](https://extensions.gnome.org/extension/8261/simpleweather/)
[![Downloads](https://img.shields.io/gnome-extensions/dt/simple-weather%40romanlefler.com?logo=gnome&logoColor=white&label=Downloads)](https://extensions.gnome.org/extension/8261/simpleweather/)
[![GNOME Shell](https://img.shields.io/badge/GNOME_Shell-46%20%7C%2048%20%7C%2049%20%7C%2050%20%7C%2051-4A86CF?logo=gnome&logoColor=white)](https://extensions.gnome.org/extension/8261/simpleweather/)
[![License](https://img.shields.io/github/license/romanlefler/SimpleWeather?label=License)](https://github.com/romanlefler/SimpleWeather/blob/development/LICENSE)
[![Languages](https://img.shields.io/github/directory-file-count/romanlefler/SimpleWeather/po?type=file&extension=po&label=Languages)](https://github.com/romanlefler/SimpleWeather/tree/development/po)

![Screenshot](./docs/assets/gallery/default-system.png)

Consult the [gallery](./docs/gallery.md) for more screenshots.

## Features

### Weather & Forecasts

- View the current conditions in the top bar
- Hourly and weekly forecasts
- Configurable weather details, including rain chance, humidity, wind, and more

### Locations

- Use your current location or any number of saved locations
- Search for locations with Nominatim or enter latitude and longitude manually
- Does not use GNOME Weather, which lets you set any location in the world
- Quickly switch between saved locations

### Customization

- Choose from US, UK, Metric, Nordic, or a custom mix of units
- Auto-configuration selects the appropriate units based on your country
- Customize the details shown in the panel and pop-up
- Multiple themes and layouts, including a theme that looks like OpenWeather Refined

### Weather Providers

- Open-Meteo works out of the box with no API key
- OpenWeatherMap is available with your own [One Call 3.0 API key](https://home.openweathermap.org/subscriptions/unauth_subscribe/onecall_30/base)
- Does not depend on GNOME Weather

## Installation

### GNOME Extensions

The recommended way to install SimpleWeather is through the GNOME extensions website.

[![Get on GNOME Extensions](./docs/assets/ego.png)](https://extensions.gnome.org/extension/8261/simpleweather/)

### Package Managers

SimpleWeather may also be available through distribution package managers.

> Package-manager versions are maintained by third parties and may not always
> match the latest upstream release.

- **ALT Linux Sisyphus**: [gnome-shell-extension-simple-weather](https://pkgs.org/download/gnome-shell-extension-simple-weather)
- **AUR** *(Arch Linux)*: [gnome-shell-extension-simpleweather](https://aur.archlinux.org/packages/gnome-shell-extension-simpleweather)
- **FreeBSD**: [gnome-shell-extension-simple-weather](https://www.freshports.org/deskutils/gnome-shell-extension-simple-weather/)

### Manual Installation

For development or manual installation, see [Building from Source](docs/building.md).

## Compatibility

SimpleWeather supports GNOME Shell versions 46, 48, 49, 50, and 51.

## Translations

Everybody is encouraged to make pull requests to add or fix
translations.

Many languages or dialects also do not exist in the project.

Check [AUTHORS](./AUTHORS) for a list of contributors.

![Translation Progress Chart](./docs/assets/transl.png)

## Building

Consult [`docs/building.md`](./docs/building.md).

## Contributing

Consult [`docs/source.md`](./docs/source.md) for relevant
source code information.

Everybody is encouraged to make pull requests to contribute
to the source code. If you plan to add a feature, it is a good
idea to make an [issue](https://github.com/romanlefler/SimpleWeather/issues)
first and label it as a feature request and add that you are willing
to do it (and perhaps how).

## License

Licensed under [GPL 3.0](./LICENSE).

Check [AUTHORS](./AUTHORS) for a list of contributors.

