"""Integration tests only against the isolated rich_in_glory_test database."""
import json, os, subprocess
from pathlib import Path
root=Path(__file__).resolve().parents[1]
runtime=json.loads((root/'.local-runtime.json').read_text())
os.environ['TEST_DATABASE_URL']='mysql+pymysql://church:'+runtime['password']+'@127.0.0.1:3307/rich_in_glory_test?charset=utf8mb4'
raise SystemExit(subprocess.call([str(root/'.venv/Scripts/python.exe'),'-m','pytest','-q','--basetemp=.pytest-tmp-mysql','--tb=short'],cwd=root,env=os.environ))
