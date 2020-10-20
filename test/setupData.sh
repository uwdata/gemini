#!/usr/bin/env bash

set -e

DATA=test/data

CWD=$(pwd)

echo "Copying data to '$DATA'."

if [ ! -d "$DATA" ]; then
  mkdir $DATA
fi

eval rsync -r "$CWD/node_modules/vega-datasets/data/*" $DATA