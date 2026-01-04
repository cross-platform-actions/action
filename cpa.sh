#!/bin/bash

export INPUT_RUN="$(cat $1)"
export CPA_SHELL_MODE=true

node "$GITHUB_ACTION_PATH/dist/index.js"
