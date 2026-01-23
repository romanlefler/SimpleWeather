
# v49.2.0

## Features

- Extension now shows "Error!" if no Internet instead of just showing nothing
- Retry button if you start without Internet or lose Internet at any point
- Option to still hide indicator instead of displaying "Error!"
- "Nordic" unit preset using speed in `m/s` that is selected by default in Nordic countries
- Option to adjust where menu appears relative to panel icon (thanks miyou379)
- Option to always show a refresh button

## Improvements

- Better place name formatting in location search results; works internationally

## Bug Fixes

- Fixed Light and Afterdark themes not changing buttons
- Fixed "0 min" sometimes being displayed on the sun countdown (now always shows "Now")
- Fixed a rare but possible crash if you start with Internet but then lose it
- Fixed an install target in the build Makefile that didn't honor $INSTALLBASE (thanks Grzegorz Szymaszek)

## Translations

- Chinese (thanks Davidasx)
- Czech (thanks lev741)
- Japanese (thanks hidenosuke)
- Polish (thanks Szymon Zielonka)
- Russian (thanks Valetss)

# v49.1.1

## Bug Fixes

- Fixes a Makefile bug where system-wide installations would fail
- For sure now fixes an error message that appeared if your locale ended with ".utf8" with no dashes

## Translations

- Dutch (thanks Ontrack16)
- Romanian (thanks Igor Sorocean)

# v49.1.0

## Improvements

- More clear coordinate format for editing a location
- Show error icon in panel on error
- Message telling you to manually configure if location detection fails

## Bug Fixes

- Fixes an error message that appeared if your locale ended with ".utf8" with no dashes

## Translations

- French (Neo-29)
- Hungarian (Adamyno)
- Japanese (hidenosuke)
- Korean (Jerry Hyun)
- Romanian (ygorigor)
- Turkish (Samo)

# v49.0.0

## Features

- GNOME 49 support
- Option to use packaged icons in panel
- Option to use symbolic or realistic icons

## Bug Fixes

- Crash on first launch with no Internet

## Translations

- Brazilian Portugese (thanks André Fernandes)
- Chinese (thanks JiaoxianDu)
- Dutch (thanks koenraad-verv)
- Japanese (thanks hidenosuke)
- Portugese (thanks André Fernandes)
- Russian (thanks Valetss)

# v48.2.0

## Features

- Option to show sun countdown instead of times in the pop-up
- Sun countdown detail

## Bug Fixes

- Fix some of pop-up not being translated
- Fix cardinal directions not being translated (thanks Davide Murtas)

## Translations

- Brazilian Portugese (thanks Alzemand)
- Bulgarian (thanks Lyubomir Vasilev)
- Chinese (thanks know-nothing-but-123)
- French (thanks Samuel St. Jean, mdouchin, & Neo-29)
- German (thanks Ahmet Ala)
- Indonesian (thanks Fakhrul Rijal)
- Italian (thanks Davide Murtas)
- Turkish (thanks Ahmet Ala)

# v48.1.0

## Features

- Support for GNOME 46
- Themes (choose between default, Light, Afterdark, and Immersive)
- Label in panel can show any weather detail
- Second available label in panel
- Show or hide the condition icon in panel
- Current weather details can be configured
- Configure where panel is shown in top bar
- Configure the location provider

## Improvements

- Change cloudy night icon to be more clear
- Credits dialog in About
- Use the word "Today" in the forecast
- Weather data copyright always shows current year
- Improve keyboard and mouse shortcuts in locations menus
- Pop-up shows which city it thinks you're in when set to My Location
- Better make script for packaging

## Bug Fixes

- Fix Mutter crash on some machines if Mutter couldn't find cursor when hovering the panel

## Translations

- German (thanks Ahmet Ala)
- Turkish (thanks Ahmet Ala)

