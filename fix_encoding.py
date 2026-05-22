import os

def replace_arrow_in_directory(directory):
    for root, dirs, files in os.walk(directory):
        if 'venv' in root or '.venv' in root or '__pycache__' in root:
            continue
        for file in files:
            if file.endswith('.py'):
                filepath = os.path.join(root, file)
                try:
                    with open(filepath, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    if '→' in content:
                        new_content = content.replace('→', '->')
                        with open(filepath, 'w', encoding='utf-8') as f:
                            f.write(new_content)
                        print(f"Replaced in {filepath}")
                except Exception as e:
                    print(f"Error reading {filepath}: {e}")

replace_arrow_in_directory('backend')
