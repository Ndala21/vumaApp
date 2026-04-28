import os
import re

SCREENS_DIR = os.path.join('src', 'screens')

for root, dirs, files in os.walk(SCREENS_DIR):
    for file in files:
        if file.endswith('.js'):
            fp = os.path.join(root, file)
            with open(fp, 'r', encoding='utf-8') as f:
                content = f.read()

            # Fix bad import placement
            bad = "import React, {\nimport { t } from '../../i18n';\n"
            good = "import { t } from '../../i18n';\nimport React, {\n"

            bad2 = "import React, {\nimport { t } from '../../../i18n';\n"
            good2 = "import { t } from '../../../i18n';\nimport React, {\n"

            if bad in content or bad2 in content:
                content = content.replace(bad, good)
                content = content.replace(bad2, good2)
                with open(fp, 'w', encoding='utf-8') as f:
                    f.write(content)
                print('Fixed: ' + file)

print('Done!')