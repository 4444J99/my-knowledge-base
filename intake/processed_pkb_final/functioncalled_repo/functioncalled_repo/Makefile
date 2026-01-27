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
