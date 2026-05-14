import os
import glob
import re

path = r'F:\AntiGravity\AudioBook-KJ\The_Architects_of_the_Living_Loom'
files = sorted(glob.glob(os.path.join(path, 'chuong_*_phan_*.md')))

for f in files:
    name = os.path.basename(f)
    with open(f, 'r', encoding='utf-8') as file:
        content = file.read(400) # Read a bit more to be sure
        # Look for summary or first few lines
        summary_match = re.search(r'\*\*Tóm tắt cốt truyện:\*\*\s*(.*)', content)
        if summary_match:
            summary = summary_match.group(1)[:150]
            print(f"{name} | SUMMARY: {summary}")
        else:
            # Fallback to first non-empty lines
            lines = [l.strip() for l in content.split('\n') if l.strip() and not l.startswith('#') and not l.startswith('*')]
            context = " ".join(lines)[:150]
            print(f"{name} | CONTEXT: {context}")
