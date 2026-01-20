#!/bin/bash

# This script will add/update staff members via the Google Apps Script API

ADMIN_API_KEY="AgXp9Km2Lq7Nv5Rt8Wz3Yc6Hf1Jd4Mb0Qx"
GAS_URL="https://script.google.com/macros/s/AKfycbwQcSZ39aGVjBYIPOVk1h-lAxfdJi5cX6SbW_H9y7P3qn-fyPlEgCGtVNGCVjzwuxnt/exec"

echo "Adding Nichola Wilson (nwilson@semester.co.uk)..."
curl -X POST "$GAS_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "addStaff",
    "adminKey": "'"$ADMIN_API_KEY"'",
    "name": "Nichola Wilson",
    "email": "nwilson@semester.co.uk",
    "role": "Recruiter"
  }'

echo -e "\n\nGetting current staff list to find Nicola Jenkinson..."
STAFF_LIST=$(curl -s "$GAS_URL?action=listStaff&adminKey=$ADMIN_API_KEY")
echo "$STAFF_LIST" | python3 -m json.tool

# Extract Nicola's staffId (requires jq which may not be installed)
# Instead, we'll manually update via the spreadsheet or via a second script

echo -e "\n\nVerifying Nichola Wilson..."
curl -s "$GAS_URL?action=verifyStaff&adminKey=$ADMIN_API_KEY&userEmail=nwilson@semester.co.uk" | python3 -m json.tool

echo -e "\n\nDone!"
