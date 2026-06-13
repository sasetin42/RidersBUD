import os
import re

directories_to_scan = ['pages', 'components', 'context', 'src']
root_dir = r"c:\Users\DELL\Desktop\PROJECT ON-GOING\RIDERS-BUD-APP\RIDERSBUD APP"

def process_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            
        # We target specifically the class 'uppercase'
        # To avoid double spaces, we can regex \s*uppercase\s* and replace carefully, 
        # but just replacing \buppercase\b is safe enough. React automatically handles extra spaces in classNames.
        new_content = re.sub(r'\buppercase\b', '', content)
        
        # Optionally, clean up multiple spaces inside className strings, but let's keep it simple.
        
        if content != new_content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"Updated {filepath}")
    except Exception as e:
        print(f"Error processing {filepath}: {e}")

# Process specific directories
for d in directories_to_scan:
    dir_path = os.path.join(root_dir, d)
    if not os.path.exists(dir_path):
        continue
    for root, dirs, files in os.walk(dir_path):
        for file in files:
            if file.endswith('.tsx') or file.endswith('.ts') or file.endswith('.jsx') or file.endswith('.js'):
                process_file(os.path.join(root, file))

# Process specific files in root if they exist
for file in ['App.tsx', 'main.tsx', 'index.html']:
    filepath = os.path.join(root_dir, file)
    if os.path.exists(filepath):
        process_file(filepath)

print("Finished removing 'uppercase' from targeted files.")
