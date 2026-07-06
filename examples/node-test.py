#!/usr/bin/env python3
"""
Simple test script for Conduit.js
Accepts one argument and returns a JSON result
"""
import sys
import json

def main():
    # Get argument if provided
    name = sys.argv[1] if len(sys.argv) > 1 else "User"
    
    # Print some debug output
    print(f"Hello, {name}!")
    print("Processing...")
    
    # Return JSON result (last line will be parsed as value)
    result = {
        "greeting": f"Hello, {name}!",
        "timestamp": "2025-02-09",
        "status": "success"
    }
    
    print(json.dumps(result))

if __name__ == "__main__":
    main()
