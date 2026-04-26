#!/bin/bash
cd "$(dirname "$0")"
echo "AZ Ember running at http://localhost:8080"
python3 -m http.server 8080
