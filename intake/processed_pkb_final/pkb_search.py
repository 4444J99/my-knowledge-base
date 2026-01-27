#!/usr/bin/env python3
"""
pkb_search.py — fast, local search over Markdown notes.
Usage:
  python pkb_search.py "query terms"           # simple substring search (case-insensitive)
  python pkb_search.py --re "regex"            # regex search
  python pkb_search.py --and term1 term2       # all terms must appear
  python pkb_search.py --or term1 term2        # any term appears
  python pkb_search.py --json "query"          # JSON output
Options:
  --root PATH      Root folder (default: current script's directory)
  --ext .md,.txt   Comma-separated extensions to scan (default: .md)
  --context N      Lines of context around hits (default: 1)
  --limit N        Max results (default: 200)
"""

import argparse, os, re, json
from pathlib import Path
from typing import Iterable

def iter_files(root: Path, exts):
    for p in root.rglob("*"):
        if p.is_file() and p.suffix.lower() in exts:
            yield p

def search_file(path: Path, pred, context=1):
    try:
        lines = path.read_text(encoding="utf-8", errors="ignore").splitlines()
    except Exception as e:
        return []
    hits = []
    for i, line in enumerate(lines, 1):
        if pred(line):
            lo = max(1, i - context)
            hi = min(len(lines), i + context)
            snippet = "\n".join(f"{n:04d}: {lines[n-1]}" for n in range(lo, hi+1))
            hits.append({"file": str(path), "line": i, "snippet": snippet})
    return hits

def make_pred(args):
    if args.re:
        rx = re.compile(args.re, re.I)
        return lambda s: rx.search(s) is not None
    q = [t.lower() for t in args.terms]
    if args.and_mode:
        return lambda s: all(t in s.lower() for t in q)
    if args.or_mode:
        return lambda s: any(t in s.lower() for t in q)
    # default simple contains of the full query string
    needle = " ".join(q).strip()
    return lambda s: needle in s.lower()

def main():
    ap = argparse.ArgumentParser(add_help=False)
    ap.add_argument("terms", nargs="*")
    ap.add_argument("--re", dest="re", default=None)
    ap.add_argument("--and", dest="and_mode", action="store_true")
    ap.add_argument("--or", dest="or_mode", action="store_true")
    ap.add_argument("--json", dest="json_mode", action="store_true")
    ap.add_argument("--root", default=str(Path(__file__).resolve().parent))
    ap.add_argument("--ext", default=".md")
    ap.add_argument("--context", type=int, default=1)
    ap.add_argument("--limit", type=int, default=200)
    ap.add_argument("-h", "--help", action="help")
    args = ap.parse_args()

    root = Path(args.root)
    exts = tuple(e.strip().lower() for e in args.ext.split(","))

    pred = make_pred(args)

    results = []
    for f in iter_files(root, exts):
        for hit in search_file(f, pred, context=args.context):
            results.append(hit)
            if len(results) >= args.limit:
                break
        if len(results) >= args.limit:
            break

    if args.json_mode:
        print(json.dumps(results, indent=2))
    else:
        for r in results:
            print(f"\n== {r['file']}:{r['line']} ==")
            print(r["snippet"])

if __name__ == "__main__":
    main()
