#
# Simple test script used by Conduit.js.
# It reads command-line arguments, builds a small JSON response,
# and prints it to stdout so another process can consume it.
# ----
# by @AkzW21
# ----
import sys
import json

def main():
    name = sys.argv[1] if len(sys.argv) > 1 else "World"
    result = {
        "message": f"Hello, {name}!",
        "status": "success"
    }
    print(json.dumps(result))

if __name__ == "__main__":
    main()