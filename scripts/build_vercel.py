"""Copy the built frontend into Vercel's CDN directory without deleting files."""
from pathlib import Path
from shutil import copytree
root = Path(__file__).resolve().parents[1]
source = root / 'frontend' / 'dist'
if not (source / 'index.html').is_file():
    raise RuntimeError('Build the frontend before preparing Vercel assets.')
copytree(source, root / 'public', dirs_exist_ok=True)
print('Frontend assets prepared for the Vercel CDN.')
