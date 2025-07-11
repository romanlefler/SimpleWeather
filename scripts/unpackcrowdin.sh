#!/bin/bash

# This file was generated by ChatGPT then modified

# Go through each subdirectory in the current directory
for dir in */; do
    # Remove trailing slash from dir name
    dir_name="${dir%/}"

    # Build new file name by replacing dashes with underscores
    new_name="${dir_name//-/_}"

    # Find the first regular file inside the subdirectory
    file=$(find "$dir" -maxdepth 1 -type f | head -n 1)

    # Move and rename the file
    mv "$file" "./$new_name.po"
    rmdir "$dir_name"
done
