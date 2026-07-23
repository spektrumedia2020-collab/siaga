#!/bin/bash
# Check retribution_rates for stall_id=4
curl -s \
  "https://hlvsbmxpkqvniemunygh.supabase.co/rest/v1/retribution_rates?select=*" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhsdnNibXhwa3F2bmllbXVueWdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Mzk4Njg4NSwiZXhwIjoyMDk5NTYyODg1fQ.ok00hmwGHs3AViVBB_VoneEWkY7Q9-hurl_O7VlyXZ0" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhsdnNibXhwa3F2bmllbXVueWdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Mzk4Njg4NSwiZXhwIjoyMDk5NTYyODg1fQ.ok00hmwGHs3AViVBB_VoneEWkY7Q9-hurl_O7VlyXZ0" \
  -H "Range-Unit: items" \
  -H "Range: 0-5" | python3 -m json.tool