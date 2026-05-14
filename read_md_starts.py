import os
import glob

path = r'F:\AntiGravity\AudioBook-KJ\The_Architects_of_the_Living_Loom'
files = sorted(glob.glob(os.path.join(path, 'chuong_*_phan_*.md')))

for f in files:
    name = os.path.basename(f)
    print(f"--- FILE: {name} ---")
    with open(f, 'r', encoding='utf-8') as file:
        # Read first 500 characters, should be enough for context
        print(file.read(500))
        print("\n")
