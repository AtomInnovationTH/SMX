#!/usr/bin/env python3
import base64
import re
import os

# Read the original HTML file
with open('Space_Monkey_Elevator.html', 'r') as f:
    html = f.read()

# Get all asset files
asset_dir = 'Space Elevator_files'
assets = {}

for filename in os.listdir(asset_dir):
    filepath = os.path.join(asset_dir, filename)
    if os.path.isfile(filepath):
        with open(filepath, 'rb') as f:
            data = f.read()
        
        # Determine MIME type
        ext = filename.lower().split('.')[-1]
        mime_types = {
            'webp': 'image/webp',
            'jpeg': 'image/jpeg',
            'jpg': 'image/jpeg',
            'png': 'image/png',
            'svg': 'image/svg+xml',
            'gif': 'image/gif'
        }
        mime = mime_types.get(ext, 'application/octet-stream')
        
        # Create data URI
        b64 = base64.b64encode(data).decode('utf-8')
        data_uri = f'data:{mime};base64,{b64}'
        
        # Store with the path as it appears in HTML
        asset_path = f'Space Elevator_files/{filename}'
        assets[asset_path] = data_uri
        print(f'Encoded: {filename} ({len(data)} bytes)')

# Replace all asset references
for path, data_uri in assets.items():
    # Replace in url() references
    html = html.replace(f"url('{path}')", f"url('{data_uri}')")
    html = html.replace(f'url("{path}")', f'url("{data_uri}")')
    html = html.replace(f"url({path})", f"url({data_uri})")
    
    # Replace in src attributes
    html = html.replace(f"src=\"{path}\"", f'src="{data_uri}"')
    html = html.replace(f"src='{path}'", f"src='{data_uri}'")
    
    # Replace string references (for JavaScript)
    html = html.replace(f"'{path}'", f"'{data_uri}'")
    html = html.replace(f'"{path}"', f'"{data_uri}"')

# Also handle ASSET_BASE_PATH + filename pattern
# Find all occurrences like ASSET_BASE_PATH + 'filename.webp'
pattern = r"ASSET_BASE_PATH \+ ['\"]([^'\"]+)['\"]"
matches = re.findall(pattern, html)
for filename in set(matches):
    full_path = f'Space Elevator_files/{filename}'
    if full_path in assets:
        # Replace the concatenation with the data URI directly
        html = re.sub(
            rf"ASSET_BASE_PATH \+ ['\"]" + re.escape(filename) + r"['\"]",
            f"'{assets[full_path]}'",
            html
        )

# Remove the ASSET_BASE_PATH constant since it's no longer needed
html = re.sub(r"const ASSET_BASE_PATH = ['\"][^'\"]*['\"];\s*", '', html)

# Write the embedded version
with open('Space_Monkey_Elevator_Embedded.html', 'w') as f:
    f.write(html)

print(f'\nCreated Space_Monkey_Elevator_Embedded.html')
print(f'Original HTML: {os.path.getsize("Space_Monkey_Elevator.html")} bytes')
print(f'Embedded HTML: {os.path.getsize("Space_Monkey_Elevator_Embedded.html")} bytes')
