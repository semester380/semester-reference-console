#!/bin/bash

# Production GAS URL and API Key
ADMIN_API_KEY="uO4KpB7Zx9qL1Fs8cYp3rN5wD2mH6vQ0TgE9jS4aB8kR1nC5uL7zX2pY6"
GAS_URL="https://script.google.com/macros/s/AKfycbx9VeVu647WJ3dQCuHX-LYAM9bdOrPfTXRpMU0K30WaBl_LIytaF4Dk8cTIdmPO3rgV/exec"

echo "===== STEP 1: Adding Nichola Wilson (nwilson@semester.co.uk) as Recruiter ====="
curl -X POST "$GAS_URL" \
  -H "Content-Type: application/json" \
  -d '{"action":"addStaff","adminKey":"'"$ADMIN_API_KEY"'","name":"Nichola Wilson","email":"nwilson@semester.co.uk","role":"Recruiter"}'

echo -e "\n\n===== STEP 2: Verifying Nichola Wilson can login ====="
curl -s "$GAS_URL?action=verifyStaff&adminKey=$ADMIN_API_KEY&userEmail=nwilson@semester.co.uk"

echo -e "\n\n===== STEP 3: Verifying Nicola Jenkinson (nicola@semester.co.uk) ====="
curl -s "$GAS_URL?action=verifyStaff&adminKey=$ADMIN_API_KEY&userEmail=nicola@semester.co.uk"

echo -e "\n\n===== DONE! ====="
