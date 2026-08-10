from pathlib import Path
import sys

from fontTools.ttLib import TTFont


if len(sys.argv) != 3:
    raise SystemExit("usage: rename-subset-font.py INPUT OUTPUT")

source = Path(sys.argv[1])
target = Path(sys.argv[2])
font = TTFont(source)
names = font["name"]
replacements = {
    1: "Polalise Sans",
    3: "Polalise Sans Variable 1.0",
    4: "Polalise Sans Variable",
    6: "PolaliseSansVariable",
    16: "Polalise Sans",
    25: "PolaliseSansVariable",
}

for name_id, value in replacements.items():
    records = [record for record in names.names if record.nameID == name_id]
    if not records:
        names.setName(value, name_id, 3, 1, 0x409)
        continue
    for record in records:
        names.setName(value, name_id, record.platformID, record.platEncID, record.langID)

for record in list(names.names):
    value = record.toUnicode()
    if "Pretendard" not in value:
        continue
    replacement = value.replace("PretendardVariable", "PolaliseSansVariable").replace(
        "Pretendard", "Polalise Sans"
    )
    names.setName(replacement, record.nameID, record.platformID, record.platEncID, record.langID)

font.save(target)
print(target)
