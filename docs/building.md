
# Building

## Testing

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
