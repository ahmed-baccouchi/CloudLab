#!/bin/bash

echo "Validating CloudLab challenge..."

RESPONSE=$(curl -s http://localhost:3000)

if [ "$RESPONSE" = "Hello World" ]; then
    echo "SUCCESS: The Node.js application is working correctly."
    exit 0
else
    echo "FAILED: The application did not return the expected response."
    echo "Expected: Hello World"
    echo "Received: $RESPONSE"
    exit 1
fi