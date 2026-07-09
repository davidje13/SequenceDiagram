#!/bin/sh
set -e;

BASE_DIR="$(dirname "$0")";
rm -r "$BASE_DIR/build" 2>/dev/null || true;
mkdir -p "$BASE_DIR/build/static";
cat \
  "$BASE_DIR/../node_modules/codemirror/lib/codemirror.css" \
  "$BASE_DIR/../node_modules/codemirror/addon/hint/show-hint.css" \
  > "$BASE_DIR/build/static/codemirror.css";

if [ -z "$PARTIAL" ]; then
  cp "$BASE_DIR/config.json" "$BASE_DIR/build/config.json";
  cp -r "$BASE_DIR/static"/* "$BASE_DIR/build/static/";
  find "$BASE_DIR/build/static" -type f -name ".DS_Store" -delete;
  rollup --config "$BASE_DIR/../scripts/rollup.config.mjs";
  rollup --config "$BASE_DIR/rollup.config.mjs";
  web-listener "$BASE_DIR/build/static" --brotli --write-compressed --no-serve;
  cd "$BASE_DIR/build";
  zip -8Xr -n .br:.png - * > ../../web-bundle.zip;
  cd - >/dev/null;
  cd "$BASE_DIR/..";
  find fonts -type f -name ".DS_Store" -delete;
  zip -9Xr - fonts > web-fonts-bundle.zip;
  cd - >/dev/null;
fi;
