import os
import re
import glob

def main():
    target_dir = r"f:\AntiGravity\AudioBook-KJ\The_Architects_of_the_Living_Loom"
    
    # Define replacements
    # Using regex with word boundaries for names to avoid partial matches
    replacements = [
        (re.compile(r'\bKael\b'), 'Kent'), 
        (re.compile(r'\bElara\b'), 'Jessie'),
        (re.compile(r'tác nhân', re.IGNORECASE), 'Agent')
    ]
    
    md_files = glob.glob(os.path.join(target_dir, "*.md"))
    
    total_files_changed = 0
    total_replacements = 0
    
    for file_path in md_files:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            
        new_content = content
        file_changed = False
        file_replacements = 0
        
        for pattern, replacement in replacements:
            new_content, count = pattern.subn(replacement, new_content)
            if count > 0:
                file_replacements += count
                
        if file_replacements > 0:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(new_content)
            total_files_changed += 1
            total_replacements += file_replacements
            print(f"Updated {os.path.basename(file_path)}: {file_replacements} replacements")
            
    print(f"\nDone! Changed {total_files_changed} files with a total of {total_replacements} replacements.")

if __name__ == "__main__":
    main()
