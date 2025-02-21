#!/bin/bash

# This script can be used when initializing labels for repositories that use gha-sem-pr-labeler.

# set -e

LABELS_TEXT_COLOR_DESCRIPTIOM=(
    "sem-pr: feat,#00bfff,Feature-related changes"
    "sem-pr: fix,#d73a4a,Fixes for bugs or errors"
    "sem-pr: docs,#0075ca,Documentation updates"
    "sem-pr: style,#ffa500,Code style changes"
    "sem-pr: refactor,#9400d3,Code refactoring"
    "sem-pr: perf,#008000,Performance improvements"
    "sem-pr: test,#ffff00,Test-related changes"
    "sem-pr: build,#b0b0b0,Build system changes"
    "sem-pr: ci,#b0b0b0,Continuous integration changes"
    "sem-pr: chore,#b0b0b0,Chores and miscellaneous tasks"
    "sem-pr: revert,#d73a4a,Reverts previous changes"
    "sem-pr: breaking change,#e99695,This change may affect existing functionality or APIs"
)

for label_color_description in "${LABELS_TEXT_COLOR_DESCRIPTIOM[@]}"; do
    label=$(echo "${label_color_description}" | cut -d ',' -f 1)
    color=$(echo "${label_color_description}" | cut -d ',' -f 2)
    description=$(echo "${label_color_description}" | cut -d ',' -f 3)
    echo "Creating label ${label} with color ${color} and description ${description}"
    gh label create "${label}" --color "${color}" --description "${description}"
done
