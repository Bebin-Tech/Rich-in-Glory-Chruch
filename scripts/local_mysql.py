"""Create an isolated development MySQL instance using an existing Windows install.
No installed services or databases are modified. Secrets stay in ignored local files.
"""
import json, os, secrets, subprocess, time
from pathlib import Path
import pymysql
ROOT=Path(__file__).resolve().parents[1]
BIN=Path(os.environ.get('MYSQL_BIN',r'C:\Program Files\MySQL\MySQL Server 8.0\bin'))
DATA=ROOT/'.local-mysql'/'data'
DATA.mkdir(parents=True,exist_ok=True)
if not (DATA/'mysql').exists():
    subprocess.run([str(BIN/'mysqld.exe'),'--no-defaults','--initialize-insecure',f'--basedir={BIN.parent}',f'--datadir={DATA}'],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
state=ROOT/'.local-runtime.json'
runtime=json.loads(state.read_text()) if state.exists() else {'password':secrets.token_hex(24),'secret':secrets.token_hex(32)}
proc=subprocess.Popen([str(BIN/'mysqld.exe'),'--no-defaults',f'--basedir={BIN.parent}',f'--datadir={DATA}','--port=3307','--bind-address=127.0.0.1','--mysqlx=0','--character-set-server=utf8mb4','--collation-server=utf8mb4_unicode_ci'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,creationflags=subprocess.CREATE_NO_WINDOW)
for _ in range(40):
    try:
        c=pymysql.connect(host='127.0.0.1',port=3307,user='root',password=runtime['password'] if state.exists() else '')
        break
    except pymysql.err.OperationalError: time.sleep(.5)
else: raise RuntimeError('MySQL did not start. Check .local-mysql error log.')
with c.cursor() as cur:
    if not state.exists(): cur.execute('ALTER USER %s@%s IDENTIFIED BY %s',('root','localhost',runtime['password']))
    cur.execute('CREATE DATABASE IF NOT EXISTS rich_in_glory CHARACTER SET utf8mb4')
    cur.execute('CREATE DATABASE IF NOT EXISTS rich_in_glory_test CHARACTER SET utf8mb4')
    cur.execute('CREATE USER IF NOT EXISTS %s@%s IDENTIFIED BY %s',('church','127.0.0.1',runtime['password']))
    cur.execute('GRANT ALL ON rich_in_glory.* TO %s@%s',('church','127.0.0.1'))
    cur.execute('GRANT ALL ON rich_in_glory_test.* TO %s@%s',('church','127.0.0.1'))
c.commit();c.close()
runtime['pid']=proc.pid;state.write_text(json.dumps(runtime))
env=ROOT/'.env'
if not env.exists():
    env.write_text('APP_ENV=development\nSECRET_KEY='+runtime['secret']+'\nDATABASE_URL=mysql+pymysql://church:'+runtime['password']+'@127.0.0.1:3307/rich_in_glory?charset=utf8mb4\nPUBLIC_ORIGIN=http://127.0.0.1:5000\n')
print('Isolated MySQL ready on 127.0.0.1:3307. Local configuration is stored in ignored .env.')
