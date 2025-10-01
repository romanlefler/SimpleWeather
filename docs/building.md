
# Building

## Testing

Running a test in GNOME 49+ requires the mutter development package to be intalled. [See below for directions on common distros.](#mutter-dev-package)

Build extension and launch shell window for testing:

```shell
./nest-test.sh
```

## Build to Build Directory

Build extension into `dist/build`:

```shell
make
```

## Create Zip Archive

Create zip archive of extension to `dist/simple-weather@romanlefler.com-vVERSION.zip`:

```shell
make pack
```

## Install to User

Install the extension for this user:

```shell
make install
```

## Clean Build Directory

Remove build files:

```shell
make clean
```

## Mutter Dev Package

### Arch Linux (Pacman)

```shell
sudo pacman -S mutter-devkit
```

### Debian (Apt)

```shell
sudo apt install mutter-dev-bin
```

### Fedora (DNF)

```shell
sudo dnf install mutter-devel
```

