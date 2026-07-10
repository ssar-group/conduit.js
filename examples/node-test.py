#!/usr/bin/env python3
import sys
import json

def main():
    name = sys.argv[1] if len(sys.argv) > 1 else "User"

    print(f"Hello, {name}!")
    print("Processing...")

    result = {
        "greeting": f"Hello, {name}!",
        "timestamp": "2025-02-09",
        "status": "success"
    }

    print(json.dumps(result))

if __name__ == "__main__":
    main()
