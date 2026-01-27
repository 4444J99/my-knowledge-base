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

