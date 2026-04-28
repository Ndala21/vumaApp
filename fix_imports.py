import os

SCREENS_DIR = os.path.join('src', 'screens')

for root, dirs, files in os.walk(SCREENS_DIR):
    for file in files:
        if file.endswith('.js'):
            fp = os.path.join(root, file)
            with open(fp, 'r', encoding='utf-8') as f:
                content = f.read()
            if "t('" in content and "import { t }" not in content:
                first_import = content.find('import ')
                insert_pos = content.find('\n', first_import) + 1
                new_import = "import { t } from '../../i18n';\n"
                content = content[:insert_pos] + new_import + content[insert_pos:]
                with open(fp, 'w', encoding='utf-8') as f:
                    f.write(content)
                print('Fixed: ' + file)

print('Done!')