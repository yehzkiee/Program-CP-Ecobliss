from pathlib import Path
import re

files = [
    Path("src/app/transaksi/btb/[id]/page.tsx"),
    Path("src/app/transaksi/bkb/[id]/page.tsx"),
    Path("src/app/transaksi/transfer/[id]/page.tsx"),
]

for p in files:
    c = p.read_text(encoding="utf-8")
    orig = c

    def fix(m: re.Match[str]) -> str:
        body = m.group(1)
        if "const vv = v ?? \"\"" in body or "const id = v ?? \"\"" in body:
            return m.group(0)
        # replace free-standing v with vv inside body
        new_body = re.sub(r"(?<![A-Za-z0-9_])v(?![A-Za-z0-9_])", "vv", body)
        return f'onValueChange={{(v) => {{ const vv = v ?? "";{new_body}}}}}'

    c = re.sub(
        r"onValueChange=\{\(v\) => \{([\s\S]*?)\n(\s*)\}\}",
        fix,
        c,
    )

    if c != orig:
        p.write_text(c, encoding="utf-8")
        print("fixed", p)
    else:
        print("no change", p)
