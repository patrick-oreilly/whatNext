from pbxproj import XcodeProject
import os

project = XcodeProject.load('/Users/patrickoreilly/Desktop/whats_next/WhatNextFront/WhatNext/WhatNext.xcodeproj/project.pbxproj')

folders_to_add = ['Models', 'ViewModels', 'Services', 'Utilities']
target_name = 'WhatNext'

base_path = '/Users/patrickoreilly/Desktop/whats_next/WhatNextFront/WhatNext/WhatNext'

for folder in folders_to_add:
    folder_path = os.path.join(base_path, folder)
    if os.path.exists(folder_path):
        for filename in os.listdir(folder_path):
            if filename.endswith('.swift'):
                file_path = os.path.join(folder_path, filename)
                print(f"Adding {file_path}")
                # Ensure it gets added to the main group and target properly
                project.add_file(file_path, force=False, target_name=target_name)

project.save()
