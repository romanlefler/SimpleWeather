#!/bin/bash

# mergepos.sh
# Usage: ./merge-pos.sh <priority_dir> <other_dir> <output_dir>

# Print help if args missing or invalid
if [ "$#" -ne 3 ]; then
    echo "Usage: $0 <priority_dir> <other_dir> <output_dir>"
    echo "Merges matching .po files from the first two directories into the third."
    echo "The first directory's translations take priority when conflicts occur."
    exit 1
fi

PRIORITY_DIR="$1"
OTHER_DIR="$2"
OUTPUT_DIR="$3"

# Validate input directories
if [ ! -d "$PRIORITY_DIR" ]; then
    echo "Error: Priority directory '$PRIORITY_DIR' does not exist."
    exit 1
fi

if [ ! -d "$OTHER_DIR" ]; then
    echo "Error: Other directory '$OTHER_DIR' does not exist."
    exit 1
fi

# Make output directory if it doesn’t exist
mkdir -p "$OUTPUT_DIR"

# Loop through *.po files in priority directory
for file in "$PRIORITY_DIR"/*.po; do
    filename=$(basename "$file")
    other_file="$OTHER_DIR/$filename"
    output_file="$OUTPUT_DIR/$filename"

    if [ -f "$other_file" ]; then
        # Merge with msgcat (priority first)
        msgcat --use-first "$file" "$other_file" -o "$output_file"
        echo "Merged: $filename"
    else
        # If no matching file in other_dir, just copy
        cp "$file" "$output_file"
        echo "Copied (no match found): $filename"
    fi
done

# Handle .po files that exist *only* in the second dir
for file in "$OTHER_DIR"/*.po; do
    filename=$(basename "$file")
    output_file="$OUTPUT_DIR/$filename"
    if [ ! -f "$output_file" ]; then
        cp "$file" "$output_file"
        echo "Copied from other dir: $filename"
    fi
done

echo "Merge complete. Output written to: $OUTPUT_DIR"

