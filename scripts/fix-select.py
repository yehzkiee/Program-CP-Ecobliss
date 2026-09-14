import re
from pathlib import Path

root = Path("src")
for p in root.rglob("*.tsx"):
    c = p.read_text(encoding="utf-8")
    orig = c

    c = re.sub(
        r"onValueChange=\{(set[A-Za-z0-9_]+)\}",
        r'onValueChange={(v) => \1(v ?? "")}',
        c,
    )
    c = c.replace(
        "onValueChange={loadFromSo}",
        'onValueChange={(v) => { if (v) loadFromSo(v); }}',
    )

    # setForm({ ...form, field: v })
    c = re.sub(
        r"onValueChange=\{\(v\) => set([A-Za-z]+)\(\{ \.\.\.(\w+), (\w+): v \}\)\}",
        r'onValueChange={(v) => set\1({ ...\2, \3: v ?? "" })}',
        c,
    )

    # multiline status casts etc: onValueChange={(v) => setForm({ ...form, status: v as X })}
    c = re.sub(
        r"onValueChange=\{\(v\) =>\s*set([A-Za-z]+)\(\{\s*\.\.\.(\w+),\s*(\w+):\s*v as ([^}]+)\}\)\}",
        r'onValueChange={(v) => set\1({ ...\2, \3: (v ?? "") as \4 })}',
        c,
        flags=re.S,
    )

    # Generic: onValueChange={(v) => { ... uses v as string ...}}
    # Fix patterns where v is assigned directly into typed string fields inside callbacks
    # onValueChange={(v) => { const next = ...; next[idx] = { ...line, field: v }; ...}}
    def wrap_callback(match: re.Match[str]) -> str:
        body = match.group(1)
        if "??" in body or "vv =" in body or "if (v)" in body:
            return match.group(0)
        # Only wrap if body uses v as a value (not only in comments)
        if re.search(r"(?<![A-Za-z0-9_])v(?![A-Za-z0-9_])", body):
            new_body = re.sub(r"(?<![A-Za-z0-9_])v(?![A-Za-z0-9_])", "vv", body)
            return f'onValueChange={{(v) => {{ const vv = v ?? ""; {new_body} }}}}'
        return match.group(0)

    c = re.sub(
        r"onValueChange=\{\(v\) => \{([\s\S]*?)\}\}",
        wrap_callback,
        c,
    )

    # Simple arrow without block: onValueChange={(v) => setFgId(v)} already handled
    # onValueChange={(v) => setX(v as Y)}
    c = re.sub(
        r"onValueChange=\{\(v\) => set([A-Za-z]+)\(v as ([^)]+)\)\}",
        r'onValueChange={(v) => set\1((v ?? "") as \2)}',
        c,
    )

    if c != orig:
        p.write_text(c, encoding="utf-8")
        print("patched", p)

print("done")
