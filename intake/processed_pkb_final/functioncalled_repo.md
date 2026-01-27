# functioncalled_repo (concatenated)



---
## functioncalled_repo/.gitignore

# build artifacts
registry/registry.json
*.pyc
__pycache__/


---
## functioncalled_repo/Makefile

PY ?= python
SCHEMA := standards/FUNCTIONcalled_Metadata_Sidecar.v1.1.schema.json
VALIDATOR := tools/validate_meta.py
REG_BUILDER := tools/registry-builder.py
META_FILES := $(shell find . -type f -name "*.meta.json" 2>/dev/null)

.PHONY: validate registry hook-install install-deps

validate:
	@[ -f $(SCHEMA) ] || (echo "Missing $(SCHEMA)" && exit 1)
	@[ -f $(VALIDATOR) ] || (echo "Missing $(VALIDATOR)" && exit 1)
	@([ -n "$(META_FILES)" ] && $(PY) $(VALIDATOR) $(META_FILES)) || (echo "No *.meta.json files found" && exit 0)

registry:
	@$(PY) $(REG_BUILDER) --root . --out registry/registry.json
	@echo "Built registry/registry.json"

hook-install:
	@mkdir -p .git/hooks
	@cat > .git/hooks/pre-commit <<'HOOK'
#!/usr/bin/env bash
SCHEMA="standards/FUNCTIONcalled_Metadata_Sidecar.v1.1.schema.json"
VALIDATOR="tools/validate_meta.py"
STAGED=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\\.meta\\.json$$' || true)
[ -z "$STAGED" ] && exit 0
echo "[pre-commit] Validating metadata sidecars..."
python "$VALIDATOR" $STAGED || { echo "[pre-commit] Validation failed."; exit 1; }
HOOK
	@chmod +x .git/hooks/pre-commit
	@echo "Installed .git/hooks/pre-commit"

install-deps:
	@$(PY) -m pip install --upgrade jsonschema


---
## functioncalled_repo/README.md

# FUNCTIONcalled() Repo Scaffold

This repository implements the FUNCTIONcalled() naming and metadata conventions.

## Structure

- **standards/**: specifications and schemas
- **tools/**: validators and registry builder scripts
- **examples/**: canonical metadata examples
- **registry/**: generated catalogues
- **core**, **interface**, **logic**, **application**: base layers for your project
- **archive/**: place for frozen history or old versions

## Usage

1. Install Python dependencies (e.g. `jsonschema`) if necessary.
2. Run `make validate` to validate all metadata files.
3. Run `make registry` to build the registry into `registry/registry.json`.
4. Run `make hook-install` to install the pre-commit hook that validates metadata on commit.

See `standards/FUNCTIONcalled_Spec_v1.0.md` for the full specification and `standards/FUNCTIONcalled_Metadata_Sidecar.v1.1.schema.json` for the metadata schema.

## Rosetta Stone Codex

Below is a mapping of file types to their roles and use-cases across the four layers:

| File Type | Technical Role | Symbolic Role | Use Case |
|-----------|---------------|--------------|---------|
| .c   | OS kernels, low-level logic | Stone tablets | Core patchbay engine |
| .cpp | Game engines, OOP systems | Forge/Craft | Narrative game engine |
| .css | Styling (web) | Vestments | Shrine visuals |
| .go  | Concurrent backend services | Messengers | APIs & sync |
| .html | Web structure | Temple/Portal | Ritual interfaces |
| .java | Android apps | Duality | Shrine apps (Android) |
| .js   | Frontend logic | Trickster/Magician | Transmutater / Shrine interactivity |
| .lua  | Lightweight scripts | Spirit/Breath | Embedded scripts |
| .m    | Legacy Apple hooks | Ancestor/Roots | Low-level Apple rituals |
| .php  | Server/CMS | Scribes/Archivists | Forum backend |
| .py   | AI/ML & scripts | Oracle/Seer | AI & storytelling |
| .rb   | Dynamic scripting | Alchemist | Generative hubs |
| .rs   | Secure concurrency | Guardian | Integrity engine |
| .swift| iOS apps | Phoenix | Shrine AR apps |

### Meta Pattern

- Systems languages (C, C++, Rust, Go) = Bones & blood vessels of the OS  
- Web stack (HTML, CSS, JS, PHP) = Skins & portals  
- Scripting & AI (Python, Lua, Ruby) = Breath & spirit  
- Mobile (Swift, Obj-C, Java) = Embodiment in the physical hand-held world



---
## functioncalled_repo/application/.gitkeep



---
## functioncalled_repo/application/README.md

# Application Directory (Mobile)

This directory contains mobile application code written in Swift, Objective-C, and Java. These files embody your project in handheld devices.

| File Type | Technical Role | Symbolic Role | Use Case |
|-----------|---------------|--------------|---------|
| .swift | iOS apps | Phoenix | Shrine AR apps |
| .m     | Legacy Apple hooks | Ancestor/Roots | Low-level Apple rituals |
| .java  | Android apps | Duality | Shrine apps (Android) |

Use the template files (`template.swift`, `template.m`, `template.java`) as starting points for mobile application modules.


---
## functioncalled_repo/application/template.java

/*
Technical Role: Android apps
Symbolic Role: Duality
Use Case: Shrine apps (Android)
*/

public class Template {
    // TODO: Implement your Java application here

    public static void main(String[] args) {
        // Entry point for test
    }
}


---
## functioncalled_repo/application/template.m

/*
Technical Role: Legacy Apple hooks
Symbolic Role: Ancestor/Roots
Use Case: Low-level Apple rituals
*/

#import <Foundation/Foundation.h>

int main(int argc, const char * argv[]) {
    @autoreleasepool {
        // TODO: Implement your Objective-C application here
    }
    return 0;
}


---
## functioncalled_repo/application/template.swift

//
// Technical Role: iOS apps
// Symbolic Role: Phoenix
// Use Case: Shrine AR apps
//

import Foundation

// TODO: Implement your Swift application here


---
## functioncalled_repo/archive/.gitkeep



---
## functioncalled_repo/core/.gitkeep



---
## functioncalled_repo/core/README.md

# Core Directory (Systems Languages)

This directory contains foundational systems code written in languages like C, C++, Rust, and Go. These files form the backbone of your project.

| File Type | Technical Role | Symbolic Role | Use Case |
|-----------|---------------|--------------|---------|
| .c   | OS kernels, low-level logic | Stone tablets | Core patchbay engine |
| .cpp | Game engines, OOP systems | Forge/Craft | Narrative game engine |
| .rs  | Safe concurrency & secure systems | Guardian | Integrity engine |
| .go  | Concurrent backend services | Messengers | APIs & sync |

Use the template files (`template.c`, `template.cpp`, `template.rs`, `template.go`) in this directory as starting points for new system-level modules. Each template includes a header comment describing the file type's roles.


---
## functioncalled_repo/core/template.c

/*
Technical Role: OS kernels, low-level logic
Symbolic Role: Stone tablets
Use Case: Core patchbay engine
*/

#include <stdio.h>

// TODO: Implement your system-level module here

int main(void) {
    // Entry point for test
    return 0;
}


---
## functioncalled_repo/core/template.cpp

/*
Technical Role: Game engines, OOP systems
Symbolic Role: Forge/Craft
Use Case: Narrative game engine
*/

#include <iostream>

// TODO: Implement your C++ module here

int main() {
    return 0;
}


---
## functioncalled_repo/core/template.go

/*
Technical Role: Concurrent backend services
Symbolic Role: Messengers
Use Case: APIs & sync
*/

package main

import "fmt"

func main() {
    // TODO: Implement your Go module here
}


---
## functioncalled_repo/core/template.rs

/*
Technical Role: Safe concurrency & secure systems
Symbolic Role: Guardian
Use Case: Integrity engine
*/

fn main() {
    // TODO: Implement your Rust module here
}


---
## functioncalled_repo/examples/example.full.logic.agent.analysis.py.meta.json

{
  "profile": "full",
  "name": "logic.agent.analysis.py",
  "identifier": "urn:uuid:123e4567-e89b-12d3-a456-426614174001",
  "version": "0.4.1",
  "schema:type": "SoftwareSourceCode",
  "conformsTo": [
    "https://schema.org/SoftwareSourceCode",
    "https://purl.org/dc/terms/"
  ],
  "encodingFormat": "text/x-python",
  "dateCreated": "2025-08-18T00:00:00Z",
  "dateModified": "2025-08-18T00:00:00Z",
  "creator": "Example Author",
  "dc:subject": ["narrative-inference", "agent"],
  "programmingLanguage": "Python",
  "license": "Apache-2.0",
  "inLanguage": "en"
}


---
## functioncalled_repo/examples/example.light.interface.portal.entry.html.meta.json

{
  "profile": "light",
  "name": "interface.portal.entry.html",
  "identifier": "urn:uuid:123e4567-e89b-12d3-a456-426614174000",
  "version": "1.0.0",
  "schema:type": "CreativeWork",
  "license": "MIT",
  "inLanguage": "en"
}


---
## functioncalled_repo/interface/.gitkeep



---
## functioncalled_repo/interface/README.md

# Interface Directory (Web Stack)

This directory contains files that define the user-facing surface of your project: HTML, CSS, JavaScript, and PHP. These files shape how your project is presented and interacted with.

| File Type | Technical Role | Symbolic Role | Use Case |
|-----------|---------------|--------------|---------|
| .html | Web structure | Temple/Portal | Ritual interfaces |
| .css  | Styling (web) | Vestments | Shrine visuals |
| .js   | Frontend logic | Trickster/Magician | Transmutater / Shrine interactivity |
| .php  | Server/CMS | Scribes/Archivists | Forum backend |

Use the template files in this directory (`template.html`, `template.css`, `template.js`, `template.php`) as starting points for new interface modules.


---
## functioncalled_repo/interface/template.css

/*
Technical Role: Styling (web)
Symbolic Role: Vestments
Use Case: Shrine visuals
*/

/* TODO: Define your CSS styles here */
body {
    margin: 0;
    padding: 0;
}


---
## functioncalled_repo/interface/template.html

<!--
Technical Role: Web structure
Symbolic Role: Temple/Portal
Use Case: Ritual interfaces
-->
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Template</title>
</head>
<body>
    <!-- TODO: Implement your HTML here -->
</body>
</html>


---
## functioncalled_repo/interface/template.js

/*
Technical Role: Frontend logic
Symbolic Role: Trickster/Magician
Use Case: Transmutater / Shrine interactivity
*/

// TODO: Implement your JavaScript here

document.addEventListener('DOMContentLoaded', () => {
    // Initialize interactive features
});


---
## functioncalled_repo/interface/template.php

<?php
/*
Technical Role: Server/CMS
Symbolic Role: Scribes/Archivists
Use Case: Forum backend
*/

// TODO: Implement your PHP logic here

?>


---
## functioncalled_repo/logic/.gitkeep



---
## functioncalled_repo/logic/README.md

# Logic Directory (Scripting & AI)

This directory holds scripts and logic modules written in Python, Lua, and Ruby. These files bring intelligence and generative power to your project.

| File Type | Technical Role | Symbolic Role | Use Case |
|-----------|---------------|--------------|---------|
| .py  | AI/ML & scripts | Oracle/Seer | AI & storytelling |
| .lua | Lightweight scripts | Spirit/Breath | Embedded scripts |
| .rb  | Dynamic scripting | Alchemist | Generative hubs |

Use the template files (`template.py`, `template.lua`, `template.rb`) as starting points for new logic modules.


---
## functioncalled_repo/logic/template.lua

-- Technical Role: Lightweight scripts
-- Symbolic Role: Spirit/Breath
-- Use Case: Embedded scripts

-- TODO: Implement your Lua script here


---
## functioncalled_repo/logic/template.py

# Technical Role: AI/ML & scripts
# Symbolic Role: Oracle/Seer
# Use Case: AI & storytelling

def main():
    # TODO: Implement your Python script here
    pass

if __name__ == "__main__":
    main()


---
## functioncalled_repo/logic/template.rb

# Technical Role: Dynamic scripting
# Symbolic Role: Alchemist
# Use Case: Generative hubs

def main
  # TODO: Implement your Ruby script here
end

if __FILE__ == $0
  main
end


---
## functioncalled_repo/registry/registry.json

{
  "resources": [
    {
      "name": "logic.agent.analysis.py",
      "path": "examples/example.full.logic.agent.analysis.py",
      "meta": "examples/example.full.logic.agent.analysis.py.meta.json"
    },
    {
      "name": "interface.portal.entry.html",
      "path": "examples/example.light.interface.portal.entry.html",
      "meta": "examples/example.light.interface.portal.entry.html.meta.json"
    }
  ]
}

---
## functioncalled_repo/standards/FUNCTIONcalled_Metadata_Sidecar.v1.1.schema.json

{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "FUNCTIONcalled Metadata Sidecar",
  "type": "object",
  "additionalProperties": true,
  "properties": {
    "profile": { "type": "string", "enum": ["light", "full"] },
    "name": { "type": "string" },
    "identifier": { "type": "string" },
    "version": { "type": "string" },
    "schema:type": { "type": "string" },
    "conformsTo": {
      "type": "array",
      "items": { "type": "string" }
    },
    "encodingFormat": { "type": "string" },
    "dateCreated": { "type": "string", "format": "date-time" },
    "dateModified": { "type": "string", "format": "date-time" },
    "creator": { "oneOf": [ {"type": "string"}, {"type": "array", "items": {"type": "string"}} ] },
    "dc:subject": { "oneOf": [ {"type": "string"}, {"type": "array", "items": {"type": "string"}} ] },
    "programmingLanguage": { "type": "string" },
    "license": { "type": "string" },
    "inLanguage": { "type": "string" }
  },
  "required": ["profile"],
  "allOf": [
    {
      "if": { "properties": { "profile": { "const": "light" } }, "required": ["profile"] },
      "then": { "required": ["profile", "name", "identifier", "version"] }
    },
    {
      "if": { "properties": { "profile": { "const": "full" } }, "required": ["profile"] },
      "then": {
        "required": [
          "profile", "name", "identifier", "version",
          "schema:type", "conformsTo", "encodingFormat",
          "dateCreated", "dateModified"
        ]
      }
    }
  ]
}


---
## functioncalled_repo/standards/FUNCTIONcalled_Spec_v1.0.md

# FUNCTIONcalled() Specification v1.0

## 0. Purpose
FUNCTIONcalled() defines a universal, self-documenting naming and structuring convention.  
It ensures that every element is named by what it is and what it does — across code, media, or knowledge systems.

## 1. Core Principle
> **Names must be autological (self-descriptive).**  
A name contains its own purpose, role, and context, so that no external lookup is required.

## 2. Naming Syntax
```
{Layer}.{Role}.{Domain}.{Extension}
```
- **Layer** → the archetypal tier the object belongs to  
  - `bones` = core / foundation / kernel  
  - `skins` = interface / portal / surface  
  - `breath` = logic / script / intelligence  
  - `body` = application / embodiment  
- **Role** → the explicit function of the element (e.g. `router`, `layout`, `agent`, `app`)  
- **Domain** → the subsystem, feature, or context (e.g. `network`, `archive`, `engine`, `user`)  
- **Extension** → the file type (`.c`, `.py`, `.html`, `.json`, `.png`, `.pdf`, etc.)

Optional fields:  
- **Target** (platform) → e.g. `web`, `cli`, `ios`, `android`  
- **Version** → `.vNN` (applied when format requires explicit versioning)

## 3. Examples
```
bones.router.network.c
skins.layout.dashboard.css
skins.portal.entry.html
breath.agent.analysis.py
breath.script.runtime.lua
body.app.mobile.swift
body.bridge.legacy.m
```

## 4. Folder Structure Convention
```
system/
├─ bones/
│  ├─ router/
│  │  └─ bones.router.network.c
│  └─ engine/
│     └─ bones.engine.core.rs
├─ skins/
│  ├─ layout/
│  │  └─ skins.layout.dashboard.css
│  └─ portal/
│     └─ skins.portal.entry.html
├─ breath/
│  ├─ agent/
│  │  └─ breath.agent.analysis.py
│  └─ script/
│     └─ breath.script.runtime.lua
└─ body/
   ├─ mobile/
   │  └─ body.app.mobile.swift
   └─ legacy/
      └─ body.bridge.legacy.m
```

## 5. Commit Message Template
Format: `[layer:role] action — scope`

Example: `[breath:agent] improve inference — caching`

## 6. Inline Header Comment Template
```
Layer: {layer} | Role: {role} | Domain: {domain}
Responsibility: {what it does}
Inputs: {inputs}
Outputs: {outputs}
Invariants: {rules/constraints}
```

## 7. Symbolic Metaphor (Optional)
The four layers correspond to archetypal metaphors:
- **Bones** = foundation, structure, integrity  
- **Skins** = portals, interfaces, aesthetics  
- **Breath** = intelligence, logic, generative power  
- **Body** = application, embodiment, lived experience

These metaphors can be swapped (machine, temple, organism, cosmos) depending on context.

## 8. Scope of Application
FUNCTIONcalled() is extensible across:
- Codebases (multi-language, multi-platform)
- Media archives (images, audio, video, 3D assets)
- Knowledge systems (papers, notes, schemas)
- Collections & museums (artifacts, taxonomy)



---
## functioncalled_repo/standards/registry.example.json

{
  "resources": [
    {
      "name": "interface.portal.entry.html",
      "path": "interface/portal/entry.html",
      "meta": "examples/example.light.interface.portal.entry.html.meta.json",
      "hash": "examplehash"
    }
  ]
}


---
## functioncalled_repo/standards/registry.schema.json

{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "FUNCTIONcalled Registry",
  "type": "object",
  "properties": {
    "resources": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "name": { "type": "string" },
          "path": { "type": "string" },
          "meta": { "type": "string" },
          "hash": { "type": "string" }
        },
        "required": ["name", "path", "meta"],
        "additionalProperties": true
      }
    }
  },
  "required": ["resources"],
  "additionalProperties": true
}


---
## functioncalled_repo/tools/registry-builder.py

#!/usr/bin/env python3
import os
import json
import argparse
import hashlib

def compute_hash(path):
    """Compute SHA256 hash of a file"""
    hasher = hashlib.sha256()
    try:
        with open(path, 'rb') as f:
            for chunk in iter(lambda: f.read(8192), b''):
                hasher.update(chunk)
        return hasher.hexdigest()
    except FileNotFoundError:
        return None

def build_registry(root):
    root = os.path.abspath(root)
    resources = []
    for dirpath, dirnames, filenames in os.walk(root):
        for filename in filenames:
            if filename.endswith('.meta.json'):
                meta_path = os.path.join(dirpath, filename)
                base_name = filename[:-len('.meta.json')]
                file_path = os.path.join(dirpath, base_name)
                rel_meta = os.path.relpath(meta_path, root)
                rel_file = os.path.relpath(file_path, root)
                try:
                    with open(meta_path) as f:
                        meta = json.load(f)
                except Exception:
                    meta = {}
                entry = {
                    "name": meta.get("name", base_name),
                    "path": rel_file,
                    "meta": rel_meta
                }
                file_hash = compute_hash(file_path)
                if file_hash:
                    entry["hash"] = file_hash
                resources.append(entry)
    return {"resources": resources}


def main():
    parser = argparse.ArgumentParser(description="Build a FUNCTIONcalled registry from metadata files")
    parser.add_argument('--root', default='.', help='Root directory to scan')
    parser.add_argument('--out', default='registry/registry.json', help='Output registry file path')
    args = parser.parse_args()
    registry = build_registry(args.root)
    out_path = os.path.abspath(args.out)
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, 'w') as f:
        json.dump(registry, f, indent=2)
    print(f"Wrote registry to {args.out}")

if __name__ == '__main__':
    main()


---
## functioncalled_repo/tools/validate_meta.py

#!/usr/bin/env python3
import json
import sys
import argparse
from jsonschema import Draft202012Validator

parser = argparse.ArgumentParser(description="Validate FUNCTIONcalled metadata sidecar files")
parser.add_argument('--schema', default='standards/FUNCTIONcalled_Metadata_Sidecar.v1.1.schema.json', help='Path to the JSON schema file')
parser.add_argument('files', nargs='+', help='Metadata files to validate')
args = parser.parse_args()

try:
    with open(args.schema) as f:
        schema = json.load(f)
except Exception as e:
    print(f"Error reading schema file {args.schema}: {e}")
    sys.exit(1)

validator = Draft202012Validator(schema)

ok = True
for path in args.files:
    try:
        with open(path) as f:
            data = json.load(f)
    except Exception as e:
        print(f"❌ {path}")
        print(f"  - error reading file: {e}")
        ok = False
        continue
    errors = sorted(validator.iter_errors(data), key=lambda e: list(e.path))
    if errors:
        ok = False
        print(f"❌ {path}")
        for err in errors:
            loc = '.'.join([str(p) for p in err.path]) or "(root)"
            print(f"  - {loc}: {err.message}")
    else:
        print(f"✅ {path}")
if not ok:
    sys.exit(1)
