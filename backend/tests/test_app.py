import io, os
import pytest
from PIL import Image
from backend.app import create_app, db, User, Content, Prayer, Progress
from werkzeug.security import generate_password_hash

@pytest.fixture
def app(tmp_path):
    if os.getenv('TEST_DATABASE_URL') and 'rich_in_glory_test' not in os.environ['TEST_DATABASE_URL']:
        raise RuntimeError('Use a dedicated rich_in_glory_test database; tests clear its tables.')
    app=create_app({'TESTING':True,'SECRET_KEY':'test-only-secret','SQLALCHEMY_DATABASE_URI':os.getenv('TEST_DATABASE_URL','sqlite://'),'RATELIMIT_ENABLED':False,'UPLOAD_FOLDER':str(tmp_path)})
    with app.app_context():
        db.drop_all(); db.create_all()
        for role in ['admin','editor','prayer','member']:
            db.session.add(User(email=role+'@test.example',role=role,password_hash=generate_password_hash('test-password-123')))
        db.session.commit()
    yield app
    with app.app_context(): db.session.remove(); db.drop_all()

@pytest.fixture
def client(app): return app.test_client()

def send(c,path,method='POST',body=None):
    token=c.get('/api/session').json['csrf']
    return c.open('/api'+path,method=method,json=body or {},headers={'X-CSRF-Token':token})

def login(c,role='admin'):
    return send(c,'/login',body={'email':role+'@test.example','password':'test-password-123'})

def add(c,module='articles',**kwargs):
    return send(c,'/admin/content/'+module,body={'title_en':'Hope','title_ta':'நம்பிக்கை','body_en':'A word of hope','body_ta':'நம்பிக்கையின் வார்த்தை','status':'published','data':{},**kwargs})

def test_csrf_and_auth(client):
    assert client.post('/api/prayer',json={'message':'private'}).status_code==403
    assert send(client,'/admin/content/articles',body={'title_en':'x'}).status_code==401
    assert login(client).status_code==200
    assert send(client,'/logout').status_code==200
    assert client.get('/api/admin/overview').status_code==401

def test_public_registration_cannot_escalate(client,app):
    r=send(client,'/register',body={'email':'new@test.example','password':'long-test-password','role':'admin'})
    assert r.status_code==201
    with app.app_context(): assert User.query.filter_by(email='new@test.example').first().role=='member'

def test_bilingual_publication_search_and_delete(client):
    login(client); r=add(client); assert r.status_code==201
    assert client.get('/api/content/articles?q=நம்பிக்கை').json['total']==1
    row=r.json; row['status']='draft'
    assert send(client,'/admin/content/item/'+str(row['id']),'PUT',row).status_code==200
    assert client.get('/api/content/articles').json['total']==0
    assert send(client,'/admin/content/item/'+str(row['id']),'DELETE',{'confirm':True}).status_code==200

def test_private_prayer_roles(client,app):
    assert send(client,'/prayer',body={'message':'Sensitive health details','consent':True}).status_code==201
    assert client.get('/api/admin/private/prayer').status_code==401
    assert client.get('/api/content/prayer').status_code==404
    login(client,'editor'); assert client.get('/api/admin/private/prayer').status_code==403
    login(client,'prayer'); rows=client.get('/api/admin/private/prayer').json['items']; assert len(rows)==1
    assert client.get('/api/admin/private/users').status_code==403
    assert send(client,'/admin/private/prayer/'+str(rows[0]['id']),'PUT',{'status':'Completed'}).status_code==200
    login(client,'admin'); assert 'password_hash' not in str(client.get('/api/admin/private/users').json)

def test_event_registration_duplicate(client):
    login(client); event=add(client,'events',data={'date':'2099-01-01','registration':True}).json
    p={'name':'Visitor','contact':'visitor@example.test','consent':True}
    assert send(client,f'/events/{event["id"]}/register',body=p).status_code==201
    assert send(client,f'/events/{event["id"]}/register',body=p).status_code==409
    assert client.get('/api/content/events').json['total']==1

def test_member_progress_isolation(client,app):
    login(client); reading=add(client,'reading',data={'date':'2026-10-11','reference':'John 1'}).json
    login(client,'member'); assert send(client,f'/progress/{reading["id"]}','PUT',{'completed':True}).status_code==200
    assert len(client.get('/api/progress').json['items'])==1
    login(client,'editor'); assert client.get('/api/progress').json['items']==[]
    login(client,'member'); send(client,f'/progress/{reading["id"]}','PUT',{'completed':False})
    assert client.get('/api/progress').json['items']==[]

def test_translation_rights_and_scheduling(client):
    login(client)
    assert add(client,'verses',data={'month':'2026-10','reference':'John 1','translation':'Authorized'}).status_code==400
    assert add(client,'verses',data={'month':'2026-10','reference':'John 1','translation':'Authorized','rights_confirmed':True}).status_code==201
    assert add(client,publish_at='2099-01-01').status_code==201
    assert client.get('/api/content/articles').json['total']==0

def test_upload_validates_and_normalizes(client):
    login(client); token=client.get('/api/session').json['csrf']
    r=client.post('/api/admin/uploads',data={'file':(io.BytesIO(b'<script>bad</script>'),'x.png')},headers={'X-CSRF-Token':token})
    assert r.status_code==400
    image=io.BytesIO(); Image.new('RGB',(10,10)).save(image,'PNG');image.seek(0)
    r=client.post('/api/admin/uploads',data={'file':(image,'../../test.png')},headers={'X-CSRF-Token':token})
    assert r.status_code==201 and r.json['url'].endswith('.webp')
    assert client.get(r.json['url']).status_code==200

def test_role_permissions_and_last_admin(client):
    login(client,'member'); assert client.get('/api/admin/content/articles').status_code==403
    login(client,'editor'); assert add(client).status_code==201
    assert send(client,'/admin/settings','PUT',{}).status_code==403
    login(client); users=client.get('/api/admin/private/users').json['items']; admin=next(u for u in users if u['role']=='admin')
    assert send(client,'/admin/users/'+str(admin['id']),'PUT',{'role':'member'}).status_code==400

def test_validation_origin_and_private_cache(client):
    token=client.get('/api/session').json['csrf']
    assert client.post('/api/prayer',json={'message':'x','consent':True},headers={'X-CSRF-Token':token,'Origin':'https://evil.example'}).status_code==403
    assert send(client,'/prayer',body={'message':'x','consent':False}).status_code==400
    assert client.get('/api/content/articles?page=bad').status_code==400
    assert client.get('/api/session').headers['Cache-Control']=='no-store'

def test_all_module_crud(client):
    from backend.app import MODULES
    login(client)
    for m in MODULES:
        r=add(client,m,status='draft'); assert r.status_code==201, (m,r.json)
        assert client.get('/api/admin/content/'+m).json['total']==1
        assert client.get('/api/content/'+m).json['total']==0

def test_sql_injection_and_pagination(client):
    login(client)
    for n in range(11): assert add(client,title_en=f'Message {n}').status_code==201
    assert len(client.get('/api/content/articles?page=2&size=9').json['items'])==2
    assert client.get('/api/content/articles?q=%27%20OR%201%3D1--').json['total']==0

def test_no_private_route_spa_fallback(client):
    assert client.get('/api/unknown').status_code==404
    assert client.get('/uploads/not-an-image').status_code==404

def test_all_admin_content_modules_crud(client):
    from backend.app import MODULES
    login(client)
    for module in MODULES:
        row=add(client,module,status='draft').json
        assert row['module']==module
        records=client.get('/api/admin/content/'+module).json
        assert records['total']==1
        row['title_en']='Updated '+module
        assert send(client,'/admin/content/item/'+str(row['id']),'PUT',row).status_code==200
        assert client.get('/api/admin/content/'+module+'?q=Updated&status=draft').json['total']==1
        assert send(client,'/admin/content/item/'+str(row['id']),'DELETE',{'confirm':True}).status_code==200
        assert client.get('/api/admin/content/'+module).json['total']==0


def test_overview_groups_content_counts_in_one_query(client,app):
    from sqlalchemy import event
    login(client)
    add(client,'articles');add(client,'photos',data={'image':'/church/worship.jpg'})
    queries=[]
    def capture(conn,cursor,statement,parameters,context,executemany):
        if 'count(' in statement.lower() and 'content' in statement.lower(): queries.append(statement)
    with app.app_context():
        event.listen(db.engine,'before_cursor_execute',capture)
        try:
            counts=client.get('/api/admin/overview').json['counts']
            assert counts['articles']==1 and counts['photos']==1 and counts['sermons']==0
            assert len(queries)==1
        finally: event.remove(db.engine,'before_cursor_execute',capture)


def test_private_search_and_pagination(client,app):
    login(client)
    rows=client.get('/api/admin/private/users?q=editor').json
    assert rows['total']==1 and rows['items'][0]['role']=='editor'
    with app.app_context():
        for n in range(25): db.session.add(Prayer(name='Visitor '+str(n),message='Test request',consent=True))
        db.session.commit()
    first=client.get('/api/admin/private/prayer').json
    second=client.get('/api/admin/private/prayer?page=2').json
    assert first['total']==25 and len(first['items'])==20 and len(second['items'])==5
    assert not set(r['id'] for r in first['items']) & set(r['id'] for r in second['items'])

def test_vercel_blob_upload_preserves_image_validation(client,app,monkeypatch):
    from types import SimpleNamespace
    BlobClient=pytest.importorskip("vercel.blob").BlobClient
    uploaded=[]
    def put(self,name,body,**kwargs):
        image=Image.open(io.BytesIO(body))
        assert image.format=='WEBP'
        assert kwargs=={'access':'public','content_type':'image/webp'}
        uploaded.append(name)
        return SimpleNamespace(url='https://church.public.blob.vercel-storage.com/'+name)
    monkeypatch.setenv('BLOB_READ_WRITE_TOKEN','test-token-only')
    monkeypatch.setattr(BlobClient,'put',put)
    app.config['MEDIA_STORAGE']='vercel_blob'
    login(client);token=client.get('/api/session').json['csrf']
    bad=client.post('/api/admin/uploads',data={'file':(io.BytesIO(b'bad'),'bad.png')},headers={'X-CSRF-Token':token})
    assert bad.status_code==400 and not uploaded
    image=io.BytesIO();Image.new('RGB',(10,10)).save(image,'PNG');image.seek(0)
    result=client.post('/api/admin/uploads',data={'file':(image,'photo.png')},headers={'X-CSRF-Token':token})
    assert result.status_code==201 and result.json['url'].startswith('https://church.public.blob.vercel-storage.com/church/')
    assert len(uploaded)==1


def test_vercel_blob_failure_returns_safe_message(client,app,monkeypatch):
    BlobClient=pytest.importorskip("vercel.blob").BlobClient
    def broken(*args,**kwargs): raise RuntimeError('private-token-must-not-leak')
    monkeypatch.setenv('BLOB_READ_WRITE_TOKEN','test-token-only')
    monkeypatch.setattr(BlobClient,'put',broken)
    app.config['MEDIA_STORAGE']='vercel_blob'
    login(client);token=client.get('/api/session').json['csrf']
    image=io.BytesIO();Image.new('RGB',(10,10)).save(image,'PNG');image.seek(0)
    result=client.post('/api/admin/uploads',data={'file':(image,'photo.png')},headers={'X-CSRF-Token':token})
    assert result.status_code==503 and 'private-token' not in result.text
