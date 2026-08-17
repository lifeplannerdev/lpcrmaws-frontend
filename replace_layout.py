import os, glob

path = 'src/Pages/FDS/*.jsx'
files = glob.glob(path)

for f in files:
    with open(f, 'r', encoding='utf-8') as file:
        content = file.read()
    
    content = content.replace("import Layout from '../../Components/Layout';", "import Navbar from '../../Components/layouts/Navbar';")
    content = content.replace("<Layout>", "<div className=\"min-h-screen bg-slate-50\"><Navbar />")
    content = content.replace("</Layout>", "</div>")
    
    with open(f, 'w', encoding='utf-8') as file:
        file.write(content)

print('Replaced in', len(files), 'files.')
