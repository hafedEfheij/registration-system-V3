#!/bin/bash

# Ensure .data directory exists
mkdir -p .data

# Check if database exists, if not copy it from server directory
if [ ! -f .data/university.db ]; then
  if [ -f server/university.db ]; then
    cp server/university.db .data/
    echo "Copied database from server directory to .data directory"
  fi
fi

# Start the server
npm start
