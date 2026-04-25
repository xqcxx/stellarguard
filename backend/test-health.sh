#!/bin/bash
echo "Testing health endpoint..."
curl -s http://localhost:3001/api/health | jq .
