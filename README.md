# SimpleWeather

A highly configurable GNOME shell extension for viewing the weather.

Supports GNOME 46, 48, 49, and 50.

![Screenshot](./docs/screenshot.png)

Support for themes, the following screenshot uses the *Immersive* theme:

![Immersive Theme Screenshot](./docs/immersivescreenshot.png)

SimpleWeather is highly configurable but has zero required setup.

## Installation

### Package Managers

Note that the following packages are not affiliated with this project or checked and may be out of date, broken, etc.
Install at your own risk.

- **ALT Linux Sisyphus**: [gnome-shell-extension-simple-weather](https://pkgs.org/download/gnome-shell-extension-simple-weather)
- **AUR** *(Arch Linux)*: [gnome-shell-extension-simpleweather](https://aur.archlinux.org/packages/gnome-shell-extension-simpleweather)
- **FreeBSD**: [gnome-shell-extension-simple-weather](https://www.freshports.org/deskutils/gnome-shell-extension-simple-weather/)

If you make a package for another platform please make an issue and tell me to list it here.

### GNOME Extensions

[![Get on GNOME Extensions](./docs/ego.png)](https://extensions.gnome.org/extension/8261/simpleweather/)

Generally the recommended way, although sometimes updates take a while to show up.

### Manual Installation

Not recommended, but a guaranteed way to have the latest version.

```shell
git clone https://github.com/romanlefler/SimpleWeather.git

cd SimpleWeather
git switch master

make install
```

Then to update, go back to the directory and pull the new version:

```shell
git pull

make install
```

## Features

- Does not depend on GNOME Weather which eliminates location issues
- Display temperature and conditions in top bar
- Configure units (US, UK, Metric, Nordic, mix and match...)
- Automatically configures units based on country
- Use current location or add any number of locations and easily cycle through
- Show hourly and weekly forecast
- Configurable details like Rain Chance, Humidity, Wind Speed, UV, etc.
- Location lookup with Nominatim or use latitude/longitude
- Change provider between Open-Meteo or OpenWeatherMap (w/ API Key)

## Translations

Everybody is encouraged to make pull requests to add or fix
translations.

Many languages or dialects also do not exist in the project.

Check [AUTHORS](./AUTHORS) for a list of contributors.

![Translation Progress Chart](./docs/transl.png)

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

Check [AUTHORS](./AUTHORS) for a list of contributors.

