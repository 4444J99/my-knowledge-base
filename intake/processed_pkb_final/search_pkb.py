#!/usr/bin/env python3
import sys, re
from pathlib import Path

BASE = Path(__file__).parent

def search(term):
    results = []
    for f in BASE.glob("*.md"):
        if f.name.startswith("INDEX") or f.name == "README.md":
            continue
        text = f.read_text(encoding="utf-8", errors="ignore")
        for i, line in enumerate(text.splitlines(), 1):
            if re.search(term, line, re.IGNORECASE):
                results.append((f.name, i, line.strip()))
    return results

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python search_pkb.py <pattern>")
        sys.exit(1)
    pattern = sys.argv[1]
    hits = search(pattern)
    for fname, line_num, line in hits:
        print(f"{fname}:{line_num}: {line}")
