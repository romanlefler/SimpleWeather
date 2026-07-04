#!/bin/sh

shopt -s nullglob

printf 'NEEDED: python-uv\n'

zips=(dist/*.zip)

# If there's more than 1 zip
if (( ${#zips[@]} > 1 )); then
    make clean
fi

# Make sure there is a zip
make pack
zips=(dist/*.zip)

uvx --python 3.12 \
  --from 'shexli==0.2.1' \
  --with 'tree-sitter==0.25.2' \
  --with 'tree-sitter-javascript==0.25.0' \
  shexli $zips | less

