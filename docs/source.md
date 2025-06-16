
# Source Code Guide

## Building

Use `./nest-test.sh` to easily test changes.
(This script runs `make install` among other things.)

For some major renaming/deleting or Makefile changes, you may need to run `make clean`.

## Extension vs. Prefs

**All** TypeScript source files are found in the `src/` directory.

`extension.ts` is the entry point for the extension.
Normal extension files are just contained in the `src/` directory
or perhaps in a subdirectory.

`prefs.ts` is the entry point for the preferences.
All preferences files besides for `prefs.ts` should be in the
`preferences/` directory. (`prefs.ts` has to be where it is since
the shell expects it to be top-level.)

### Clutter vs. GTK

You cannot import GTK into the extension ecosystem and you cannot
import shell files into the prefs ecosystem.
This means that GUIs in the extension system use `St` and `Clutter`
while GUIs in the prefs system use `GTK`.

### GNU gettext

This leads to conflicts with `gettext`. Since many files, such as
`config.ts` or `location.ts` are re-used in both ecosystems, they
use a wrapper for `gettext` found in `gettext.ts`.

`gettext` is usually imported from `gettext.ts` and aliased as `_g`
and not `_`, since `_` in this project is used as a discard.

## HTTP Requests

HTTP requests are done by `libsoup.ts` which is a wrapper around Soup.
A single instance is passed around and its `fetchJson` method
is useful for easily sending a request.

You have the option to use a generic user agent or an app-specific one.
Spoofing the user agent is really not doing that much, but it still should
be done for every call *unless the TOS of the service specifically forbids
it (e.g. Nominatim).*

There are many errors that can happen, so the caller should be prepared to
do something on an error. Note that if `e instanceof Gio.ResolverError`,
then it can be assumed to mean that the system has no Internet.

# Style

## Imports

Always make sure you aren't importing GTK into the extension ecosystem,
and likewise shell files into the prefs ecosystem.

Do not ever import node modules (start with `@`) such as `@girs/soup-3.0`.
Instead you should only import modules that start with `gi://` or `resource://`
or other files in this project.

## Promises

Promises should be used wherever possible instead of callbacks.
Note that the GTK, GLib, etc. functions use callbacks.

All promises should appropriately catch errors at some point in
their chain; if you see the warning in the debug console that
a promise was uncaught, then you have done something wrong.
