import re
import subprocess

def get_git_file(commit, path):
    result = subprocess.run(['git', 'show', f"{commit}:{path}"], capture_output=True, text=True)
    return result.stdout

old_content = get_git_file('6f440c0', 'src/Pages/ReportViewPage.jsx')
with open('src/Pages/ReportViewPage.jsx', 'r', encoding='utf-8') as f:
    current_content = f.read()

match = re.search(r'(        \{\/\* Agenda Content \*\/}.*?)(?=        \{\/\* Report Info \*\/})', old_content, re.DOTALL)
if match:
    blocks_to_restore = match.group(1)
    
    if '{/* Report Info */}' in current_content:
        current_content = current_content.replace('        {/* Report Info */}', blocks_to_restore + '        {/* Report Info */}')
        with open('src/Pages/ReportViewPage.jsx', 'w', encoding='utf-8') as f:
            f.write(current_content)
        print("Restored successfully")
    else:
        print("Could not find Report Info marker")
else:
    print("Could not find the blocks in old commit")
