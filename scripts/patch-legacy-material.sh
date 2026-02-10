#!/bin/bash
# Patches pre-compiled @sunbird-cb/* packages that contain legacy Angular Material imports.
# Angular Material 17 removed the legacy compatibility layer, so we need to replace
# @angular/material/legacy-* paths with @angular/material/* in the pre-compiled .mjs files.
#
# This script should be run after npm install via the "postinstall" script in package.json.
# It uses a Python script to intelligently merge import statements to avoid duplicate identifiers.

echo "Patching @sunbird-cb packages for Angular Material 17 compatibility..."

PACKAGES=(
  "node_modules/@sunbird-cb/toc/fesm2022/sunbird-cb-toc.mjs"
  "node_modules/@sunbird-cb/utils-v2/fesm2022/sunbird-cb-utils-v2.mjs"
  "node_modules/@sunbird-cb/consumption/fesm2022/sunbird-cb-consumption.mjs"
  "node_modules/@sunbird-cb/discussion-v2/fesm2022/sunbird-cb-discussion-v2.mjs"
  "node_modules/@sunbird-cb/notification/fesm2022/sunbird-cb-notification.mjs"
  "node_modules/@sunbird-cb/rain-dashboards/fesm2022/sunbird-cb-rain-dashboards.mjs"
  "node_modules/@sunbird-cb/resolver-v2/fesm2022/sunbird-cb-resolver-v2.mjs"
)

for file in "${PACKAGES[@]}"; do
  if [ -f "$file" ]; then
    python3 scripts/patch-legacy-material.py "$file"
    echo "  Patched: $file"
  fi
done

echo "Done."
