
# Themes

Themes are done by dynamically adding the correct classes onto widgets for the chosen theme.

## Files and Naming

Themes are stored in the `themes/` directory as `<name>.css`.

In order for them to appear in the settings, they must be added to
`src/preferences/generalPage.ts` in the themes model and array.

Each class takes the name of `sw-style-<theme>-<class>`.

Example of a "sky" theme in `themes/sky.css`:

```css
.sw-style-sky-bg {
    background: #C2DAE6;
}

.sw-style-sky-forecast-box:hover {
    background: #DAEBF2;
}
```

> **Note**
> `light` is a good example of a theme.

### Notes

Prefer `background` over `background-color` in case a GTK style uses a background image.

### Classes

```
menu
|--- bg
|    |--- left-box
|    |--- forecast-box
|    |--- faded
```

Additional clases:

```
button
```

