#!/usr/bin/env python3
"""
Patches a pre-compiled Angular .mjs file to replace legacy Material imports
with their non-legacy equivalents, handling duplicate identifiers that arise
when both legacy and non-legacy imports exist for the same module.

Usage: python3 patch-legacy-material.py <file.mjs>

Strategy:
1. Replace all legacy module paths: @angular/material/legacy-X -> @angular/material/X
2. Replace all legacy identifiers: MatLegacyFoo -> MatFoo, MAT_LEGACY_FOO -> MAT_FOO
3. Deduplicate: if two import lines import from the same module, merge their named imports
4. Remove duplicate named imports within a single import statement
"""

import re
import sys
from collections import OrderedDict


LEGACY_PATH_MAP = {
    '/legacy-autocomplete': '/autocomplete',
    '/legacy-button': '/button',
    '/legacy-card': '/card',
    '/legacy-checkbox': '/checkbox',
    '/legacy-chips': '/chips',
    '/legacy-core': '/core',
    '/legacy-dialog': '/dialog',
    '/legacy-form-field': '/form-field',
    '/legacy-input': '/input',
    '/legacy-list': '/list',
    '/legacy-menu': '/menu',
    '/legacy-paginator': '/paginator',
    '/legacy-progress-bar': '/progress-bar',
    '/legacy-progress-spinner': '/progress-spinner',
    '/legacy-radio': '/radio',
    '/legacy-select': '/select',
    '/legacy-slide-toggle': '/slide-toggle',
    '/legacy-slider': '/slider',
    '/legacy-snack-bar': '/snack-bar',
    '/legacy-table': '/table',
    '/legacy-tabs': '/tabs',
    '/legacy-tooltip': '/tooltip',
}

# Regex for named import line: import { Foo, Bar as Baz } from 'module';
NAMED_IMPORT_RE = re.compile(
    r"^import\s*\{([^}]+)\}\s*from\s*['\"]([^'\"]+)['\"];?\s*$"
)

# Regex for namespace import: import * as foo from 'module';
NAMESPACE_IMPORT_RE = re.compile(
    r"^import\s*\*\s*as\s+(\w+)\s+from\s*['\"]([^'\"]+)['\"];?\s*$"
)


def replace_legacy_paths(content: str) -> str:
    """Replace legacy module paths."""
    for legacy, non_legacy in LEGACY_PATH_MAP.items():
        content = content.replace(f'@angular/material{legacy}', f'@angular/material{non_legacy}')
    return content


def replace_legacy_identifiers(content: str) -> str:
    """Replace legacy class/constant names."""
    # Replace MatLegacyFoo as MatFoo -> MatFoo
    content = re.sub(r'\bMatLegacy(\w+)\s+as\s+Mat(\1)\b', r'Mat\1', content)
    content = re.sub(r'\bMAT_LEGACY_(\w+)\s+as\s+MAT_(\1)\b', r'MAT_\1', content)
    # Replace remaining MatLegacy* -> Mat*
    content = re.sub(r'\bMatLegacy(\w+)\b', r'Mat\1', content)
    content = re.sub(r'\bMAT_LEGACY_(\w+)\b', r'MAT_\1', content)
    # Replace LegacyFoo -> Foo for remaining legacy types
    content = re.sub(r'\bLegacyPageEvent\b', 'PageEvent', content)
    content = re.sub(r'\bLegacyProgressSpinnerMode\b', 'ProgressSpinnerMode', content)
    # MatChipList was renamed to MatChipListbox in Material 17
    content = re.sub(r'\bMatChipList\b', 'MatChipListbox', content)
    return content


def parse_named_imports(import_str: str) -> list:
    """Parse named import specifiers from the { ... } part."""
    items = []
    for item in import_str.split(','):
        item = item.strip()
        if item:
            items.append(item)
    return items


def deduplicate_imports(lines: list) -> list:
    """Merge duplicate imports from the same module, preserving order."""
    result = []
    # Track: module_path -> (line_index_in_result, set_of_named_imports)
    module_imports: OrderedDict = OrderedDict()

    for line in lines:
        named_match = NAMED_IMPORT_RE.match(line)
        ns_match = NAMESPACE_IMPORT_RE.match(line)

        if named_match:
            imports_str = named_match.group(1)
            module_path = named_match.group(2)
            new_imports = parse_named_imports(imports_str)

            if module_path in module_imports:
                # Merge with existing
                existing_idx, existing_imports = module_imports[module_path]
                for imp in new_imports:
                    # Check for duplicate (by the local name, i.e. the part after 'as' if present)
                    local_name = imp.split(' as ')[-1].strip() if ' as ' in imp else imp.strip()
                    existing_locals = set()
                    for e in existing_imports:
                        el = e.split(' as ')[-1].strip() if ' as ' in e else e.strip()
                        existing_locals.add(el)
                    if local_name not in existing_locals:
                        existing_imports.append(imp)
                # Rebuild the import line
                merged = ', '.join(existing_imports)
                result[existing_idx] = f"import {{ {merged} }} from '{module_path}';"
            else:
                # Deduplicate within this single import line
                seen_locals = set()
                deduped = []
                for imp in new_imports:
                    local_name = imp.split(' as ')[-1].strip() if ' as ' in imp else imp.strip()
                    if local_name not in seen_locals:
                        seen_locals.add(local_name)
                        deduped.append(imp)
                module_imports[module_path] = (len(result), deduped)
                merged = ', '.join(deduped)
                result.append(f"import {{ {merged} }} from '{module_path}';")
        elif ns_match:
            ns_name = ns_match.group(1)
            module_path = ns_match.group(2)
            # Namespace imports can coexist with named imports; just keep them
            result.append(line)
        else:
            result.append(line)

    return result


def patch_file(filepath: str):
    with open(filepath, 'r') as f:
        content = f.read()

    # Step 1: Replace legacy paths
    content = replace_legacy_paths(content)

    # Step 2: Replace legacy identifiers
    content = replace_legacy_identifiers(content)

    # Step 3: Deduplicate imports
    lines = content.split('\n')
    lines = deduplicate_imports(lines)

    content = '\n'.join(lines)

    with open(filepath, 'w') as f:
        f.write(content)


if __name__ == '__main__':
    if len(sys.argv) != 2:
        print(f"Usage: {sys.argv[0]} <file.mjs>", file=sys.stderr)
        sys.exit(1)
    patch_file(sys.argv[1])
