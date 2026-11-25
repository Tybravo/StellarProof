#!/usr/bin/env python3
"""
emit_annotations.py

Reads the scanner's JSON output file and prints GitHub Actions workflow
commands (::error / ::warning) with the strict escaping required to keep
malicious diff content from injecting workflow commands. Also prints the
scan verdict (block | warn | pass) to stdout for the workflow to capture.

Usage:
    python3 emit_annotations.py --results scan-results.json

Output (stdout):
    ::error file=...,line=...,title=...::message     (one per critical)
    ::warning file=...,line=...,title=...::message   (one per warning)
    VERDICT=block|warn|pass
"""

import argparse
import json
import sys


def esc(s: str) -> str:
    """Escape a value for a workflow-command property or message.

    GitHub decodes the escapes in this order: % -> %25, CR -> %0D, LF -> %0A
    (applies to both properties and message), then : -> %3A and , -> %2C
    (properties only).
    """
    s = str(s)
    return (
        s.replace("%", "%25")
        .replace("\r", "%0D")
        .replace("\n", "%0A")
    )


def esc_prop(s: str) -> str:
    return esc(s).replace(":", "%3A").replace(",", "%2C")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--results", required=True, help="Scanner JSON output path")
    ap.add_argument("--no-annotations", action="store_true",
                    help="Only print the verdict, skip ::error/::warning lines")
    args = ap.parse_args()

    with open(args.results, encoding="utf-8") as f:
        data = json.load(f)

    verdict = data.get("verdict", "block")  # fail-safe

    if not args.no_annotations:
        for fnd in data.get("findings", []):
            sev = fnd.get("severity")
            if sev not in ("critical", "warning"):
                continue
            props = {
                "file": fnd.get("path") or "CHANGES",
                "line": fnd.get("line") or 1,
                "title": fnd.get("category") or "finding",
            }
            prop_str = "".join(
                f"{k}={esc_prop(v)}," for k, v in props.items()
            ).rstrip(",")
            msg = esc(fnd.get("message") or "Malware-scan finding")
            cmd = "error" if sev == "critical" else "warning"
            print(f"::{cmd} {prop_str}::{msg}")

    # Machine-readable verdict for the workflow to branch on.
    print(f"VERDICT={verdict}")
    return 0


if __name__ == "__main__":
    sys.exit(main())