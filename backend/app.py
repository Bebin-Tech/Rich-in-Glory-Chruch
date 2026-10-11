"""Rich in Glory REST service. Private records never use public content routes."""
import os, re, secrets, uuid
from datetime import date, datetime, timedelta, timezone
from functools import wraps
from pathlib import Path
from urllib.parse import urlparse
import click
from dotenv import load_dotenv
from flask import Flask, jsonify, request, session, send_from_directory, abort
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy import func
from werkzeug.security import generate_password_hash, check_password_hash
from PIL import Image, UnidentifiedImageError

load_dotenv(Path(__file__).resolve().parents[1] / '.env')
db = SQLAlchemy()
migrate = Migrate()
limiter = Limiter(key_func=get_remote_address)
MODULES = ['about','leadership','services','sermons','events','verses','reading','studies','albums','photos','videos','articles','messages','faqs']

class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(254), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), nullable=False, default='member')
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

class Content(db.Model):
    """Uniform bilingual publishing envelope; module-specific fields are validated JSON."""
    __tablename__ = 'content'
    id = db.Column(db.Integer, primary_key=True)
    module = db.Column(db.String(30), nullable=False, index=True)
    title_en = db.Column(db.String(255), nullable=False)
    title_ta = db.Column(db.String(255), default='')
    body_en = db.Column(db.Text, default='')
    body_ta = db.Column(db.Text, default='')
    category = db.Column(db.String(100), default='', index=True)
    status = db.Column(db.String(20), default='draft', index=True)
    publish_at = db.Column(db.String(10), default='', index=True)
    sort_order = db.Column(db.Integer, default=0)
    data = db.Column(db.JSON, default=dict)
    parent_id = db.Column(db.Integer, db.ForeignKey('content.id', ondelete='SET NULL'), nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    def public(self):
        return {k:getattr(self,k) for k in ['id','module','title_en','title_ta','body_en','body_ta','category','status','publish_at','sort_order','parent_id','data']}

class Settings(db.Model):
    __tablename__ = 'church_settings'
    id = db.Column(db.Integer, primary_key=True)
    data = db.Column(db.JSON, default=dict)

class Prayer(db.Model):
    __tablename__ = 'prayer_requests'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), default='')
    contact = db.Column(db.String(254), default='')
    category = db.Column(db.String(100), default='')
    message = db.Column(db.Text, nullable=False)
    consent = db.Column(db.Boolean, nullable=False)
    status = db.Column(db.String(20), default='New', index=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), index=True)

class Enquiry(db.Model):
    __tablename__ = 'contact_enquiries'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    contact = db.Column(db.String(254), nullable=False)
    message = db.Column(db.Text, nullable=False)
    consent = db.Column(db.Boolean, nullable=False)
    status = db.Column(db.String(20), default='New')
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), index=True)

class Registration(db.Model):
    __tablename__ = 'event_registrations'
    id = db.Column(db.Integer, primary_key=True)
    event_id = db.Column(db.Integer, db.ForeignKey('content.id', ondelete='CASCADE'), nullable=False, index=True)
    name = db.Column(db.String(100), nullable=False)
    contact = db.Column(db.String(254), nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    __table_args__ = (db.UniqueConstraint('event_id','contact'),)

class Progress(db.Model):
    __tablename__ = 'reading_progress'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    reading_id = db.Column(db.Integer, db.ForeignKey('content.id', ondelete='CASCADE'), nullable=False)
    completed_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    __table_args__ = (db.UniqueConstraint('user_id','reading_id'),)

class Audit(db.Model):
    __tablename__ = 'audit_logs'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'))
    action = db.Column(db.String(100), nullable=False)
    target = db.Column(db.String(100), nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), index=True)

def fail(message, code=400):
    abort(code, description=message)

def auth(*roles):
    def decorator(fn):
        @wraps(fn)
        def guarded(*args, **kwargs):
            u = db.session.get(User, session.get('uid')) if session.get('uid') else None
            if not u: fail('Please sign in.', 401)
            if roles and u.role not in roles: fail('Access denied.',403)
            return fn(*args, **kwargs)
        return guarded
    return decorator

def payload():
    p = request.get_json(silent=True)
    if not isinstance(p,dict): fail('A JSON object is required.')
    return p

def string(p,key,limit=1000,required=False):
    v = p.get(key,'')
    if not isinstance(v,str) or len(v)>limit: fail(f'Invalid {key}.')
    v=v.strip()
    if required and not v: fail(f'{key} is required.')
    return v

def visible():
    return (Content.status=='published') & ((Content.publish_at=='') | (Content.publish_at<=church_today().isoformat()))

def church_today():
    return datetime.now(timezone(timedelta(hours=5,minutes=30))).date()

def log(action,target):
    db.session.add(Audit(user_id=session.get('uid'),action=action,target=str(target)))

def validate_content(p,module):
    result={k:string(p,k,255 if k.startswith('title') else 20000,k=='title_en') for k in ['title_en','title_ta','body_en','body_ta']}
    result['category']=string(p,'category',100)
    result['status']=string(p,'status',20) or 'draft'
    if result['status'] not in ['draft','published','archived']: fail('Invalid publication status.')
    result['publish_at']=string(p,'publish_at',10)
    if result['publish_at']:
        try: date.fromisoformat(result['publish_at'])
        except ValueError: fail('Invalid publication date.')
    result['sort_order']=p.get('sort_order',0)
    if not isinstance(result['sort_order'],int): fail('Order must be an integer.')
    data=p.get('data',{})
    if not isinstance(data,dict) or len(str(data))>30000: fail('Invalid content details.')
    for k,v in data.items():
        if not isinstance(v,(str,bool,int,float)) or len(str(v))>20000: fail('Details must contain simple values.')
        if k in ['image','video','attachment'] and v:
            if not isinstance(v,str): fail('Invalid media URL.')
            parsed=urlparse(v)
            if k=='video':
                if parsed.scheme!='https' or parsed.hostname not in ['youtube.com','www.youtube.com','youtu.be','www.youtube-nocookie.com']: fail('Use an HTTPS YouTube URL.')
            elif not (v.startswith('/uploads/') or (k=='image' and re.fullmatch(r'/church/[a-z-]+\.jpg',v)) or parsed.scheme=='https'): fail('Use an uploaded file or HTTPS image URL.')
    for key in ['date','month']:
        if data.get(key):
            try: date.fromisoformat(data[key]+'-01' if key=='month' else data[key])
            except (ValueError,TypeError): fail('Invalid date or month.')
    if result['status']=='published':
        required={'events':['date'],'verses':['month','reference','translation'],'reading':['date','reference']}.get(module,[])
        if any(not data.get(k) for k in required): fail('Missing required details: '+', '.join(required))
        if module=='verses' and data.get('rights_confirmed') is not True: fail('Confirm permission to publish both verse translations.')
    result['data']=data
    parent=p.get('parent_id')
    if parent is not None:
        album=db.session.get(Content,parent) if isinstance(parent,int) else None
        if module!='photos' or not album or album.module!='albums': fail('Select a valid album.')
    result['parent_id']=parent
    return result

def create_app(test_config=None):
    app=Flask(__name__,static_folder='../frontend/dist',static_url_path='/assets-static')
    production=os.getenv('APP_ENV')=='production'
    app.config.update(SECRET_KEY=os.getenv('SECRET_KEY') or (None if production else secrets.token_hex(32)),SQLALCHEMY_DATABASE_URI=os.getenv('DATABASE_URL','sqlite:///development.db'),SQLALCHEMY_TRACK_MODIFICATIONS=False,SESSION_COOKIE_HTTPONLY=True,SESSION_COOKIE_SAMESITE='Lax',SESSION_COOKIE_SECURE=production,PERMANENT_SESSION_LIFETIME=timedelta(hours=8),MAX_CONTENT_LENGTH=8*1024*1024,RATELIMIT_STORAGE_URI=os.getenv('RATELIMIT_STORAGE_URI','memory://'),UPLOAD_FOLDER=str(Path(os.getenv('UPLOAD_FOLDER',str(Path(__file__).parent/'uploads'))).resolve()))
    if test_config: app.config.update(test_config)
    if not app.config['SECRET_KEY']: raise RuntimeError('Set SECRET_KEY before production startup.')
    if production and not app.config.get('TESTING'):
        if len(app.config['SECRET_KEY'])<32 or 'replace-with' in app.config['SECRET_KEY']: raise RuntimeError('Use a strong random SECRET_KEY.')
        if not app.config['SQLALCHEMY_DATABASE_URI'].startswith('mysql'): raise RuntimeError('Production requires MySQL.')
        if app.config['RATELIMIT_STORAGE_URI']=='memory://': raise RuntimeError('Production requires shared rate-limit storage, e.g. Redis.')
    db.init_app(app); migrate.init_app(app,db); limiter.init_app(app)

    @app.before_request
    def csrf():
        if request.path.startswith('/api/') and request.method not in ['GET','HEAD','OPTIONS']:
            token=session.get('csrf')
            if not token or not secrets.compare_digest(token,request.headers.get('X-CSRF-Token','')): fail('Session expired. Refresh and try again.',403)
            origin=request.headers.get('Origin')
            allowed=os.getenv('PUBLIC_ORIGIN',request.host_url.rstrip('/'))
            if origin and origin not in [allowed,request.host_url.rstrip('/')]: fail('Origin denied.',403)

    @app.after_request
    def headers(r):
        r.headers['X-Content-Type-Options']='nosniff'; r.headers['Referrer-Policy']='strict-origin-when-cross-origin'
        r.headers['X-Frame-Options']='DENY'
        r.headers['Content-Security-Policy']="default-src 'self'; img-src 'self' https: data:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; script-src 'self'; connect-src 'self'; frame-src https://www.youtube-nocookie.com https://www.google.com; base-uri 'self'; form-action 'self'; object-src 'none'"
        if request.path.startswith('/api/'): r.headers['Cache-Control']='no-store'
        if production: r.headers['Strict-Transport-Security']='max-age=31536000'
        return r

    @app.errorhandler(Exception)
    def error(e):
        if isinstance(e,SQLAlchemyError):
            db.session.rollback(); return jsonify(error='Database unavailable. Please try again.'),503
        code=getattr(e,'code',500)
        return jsonify(error=getattr(e,'description','An unexpected error occurred.')),code

    @app.get('/api/session')
    def get_session():
        if 'csrf' not in session: session['csrf']=secrets.token_urlsafe(32)
        u=db.session.get(User,session['uid']) if session.get('uid') else None
        return jsonify(csrf=session['csrf'],user={'id':u.id,'email':u.email,'role':u.role} if u else None)

    @app.post('/api/login')
    @limiter.limit('5 per minute')
    def login():
        p=payload(); email=string(p,'email',254).lower(); password=string(p,'password',256)
        u=User.query.filter_by(email=email).first()
        dummy=app.config.setdefault('DUMMY_HASH',generate_password_hash(secrets.token_hex(20)))
        ok=check_password_hash(u.password_hash if u else dummy,password)
        if not u or not ok: fail('Incorrect email or password.',401)
        session.clear(); session['uid']=u.id; session['csrf']=secrets.token_urlsafe(32); session.permanent=True
        return jsonify(csrf=session['csrf'],user={'id':u.id,'email':u.email,'role':u.role})

    @app.post('/api/register')
    @limiter.limit('3 per hour')
    def register():
        p=payload(); email=string(p,'email',254,True).lower(); password=string(p,'password',256,True)
        if not re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+',email) or len(password)<12: fail('Use a valid email and at least 12 password characters.')
        db.session.add(User(email=email,password_hash=generate_password_hash(password),role='member'))
        try: db.session.commit()
        except IntegrityError: db.session.rollback(); fail('Unable to create account. Try signing in.',409)
        return jsonify(ok=True),201

    @app.post('/api/logout')
    def logout(): session.clear(); return jsonify(ok=True)

    @app.get('/api/settings')
    def settings():
        row=db.session.get(Settings,1)
        return jsonify(row.data if row else {})

    @app.put('/api/admin/settings')
    @auth('admin')
    def save_settings():
        p=payload(); allowed=['address','phone','email','whatsapp','maps','instagram','facebook','youtube','donation_url','donation_verified','hero_image']
        p={k:v for k,v in p.items() if k in allowed}
        for k,v in p.items():
            if k=='donation_verified':
                if not isinstance(v,bool): fail('Verification must be true or false.')
            elif not isinstance(v,str) or len(v)>2000: fail('Invalid setting.')
            elif k in ['maps','instagram','facebook','youtube','donation_url','hero_image'] and v and not v.startswith('https://') and not (k=='hero_image' and (v.startswith('/uploads/') or re.fullmatch(r'/church/[a-z-]+\.jpg',v))): fail('Links must use HTTPS.')
        row=db.session.get(Settings,1) or Settings(id=1); row.data=p; db.session.add(row); log('settings.update',1); db.session.commit(); return jsonify(ok=True)

    @app.get('/api/content/<module>')
    def content(module):
        if module not in MODULES: fail('Module not found.',404)
        q=Content.query.filter(Content.module==module,visible())
        search=request.args.get('q','')[:200]; category=request.args.get('category','')[:100]
        if search: q=q.filter(db.or_(Content.title_en.contains(search),Content.title_ta.contains(search),Content.body_en.contains(search),Content.body_ta.contains(search)))
        if category: q=q.filter_by(category=category)
        if module=='events' and request.args.get('period') in ['past','upcoming']:
            field=Content.data['date'].as_string()
            q=q.filter(field<church_today().isoformat() if request.args['period']=='past' else field>=church_today().isoformat())
        if module=='verses': q=q.filter(Content.data['month'].as_string()<=church_today().isoformat()[:7])
        if module=='photos' and request.args.get('album'):
            try: q=q.filter_by(parent_id=int(request.args['album']))
            except ValueError: fail('Invalid album.')
        try: page=max(1,int(request.args.get('page',1))); size=min(100,max(1,int(request.args.get('size',9))))
        except ValueError: fail('Invalid pagination.')
        categories=[x[0] for x in db.session.query(Content.category).filter(Content.module==module,visible(),Content.category!='').distinct().all()]
        order=[Content.sort_order,Content.id.desc()]
        if module=='events': order=[Content.data['date'].as_string(),Content.id]
        if module=='reading': order=[Content.data['date'].as_string(),Content.id]
        if module=='verses': order=[Content.data['month'].as_string().desc(),Content.id.desc()]
        if request.args.get('featured')=='true': q=q.filter(Content.data['featured'].as_boolean()==True)
        if request.args.get('important')=='true': q=q.filter(Content.data['important'].as_boolean()==True)
        total=q.count(); rows=q.order_by(*order).offset((page-1)*size).limit(size).all()
        return jsonify(items=[r.public() for r in rows],total=total,page=page,categories=categories)

    @app.get('/api/content/item/<int:id>')
    def detail(id):
        r=Content.query.filter(Content.id==id,visible()).first_or_404(); return jsonify(r.public())

    def intake(model):
        p=payload()
        if p.get('consent') is not True: fail('Consent is required.')
        values={k:string(p,k,n,required) for k,n,required in [('name',100,model==Enquiry),('contact',254,model==Enquiry),('message',5000,True)]}
        if model==Prayer: values['category']=string(p,'category',100)
        db.session.add(model(**values,consent=True)); db.session.commit(); return jsonify(ok=True),201

    @app.post('/api/prayer')
    @limiter.limit('5 per hour')
    def prayer(): return intake(Prayer)

    @app.post('/api/contact')
    @limiter.limit('5 per hour')
    def contact(): return intake(Enquiry)

    @app.post('/api/events/<int:id>/register')
    @limiter.limit('10 per hour')
    def event_register(id):
        e=Content.query.filter(Content.id==id,Content.module=='events',visible()).first_or_404()
        if not e.data.get('registration') or e.data.get('date','')<church_today().isoformat(): fail('Registration is closed.')
        p=payload()
        if p.get('consent') is not True: fail('Consent is required.')
        db.session.add(Registration(event_id=id,name=string(p,'name',100,True),contact=string(p,'contact',254,True).lower()))
        try: db.session.commit()
        except IntegrityError: db.session.rollback(); fail('This contact is already registered.',409)
        return jsonify(ok=True),201

    @app.get('/api/progress')
    @auth()
    def progress():
        rows=Progress.query.filter_by(user_id=session['uid']).all()
        today=church_today(); week=today-timedelta(days=today.weekday())
        q=db.session.query(Content).join(Progress,Progress.reading_id==Content.id).filter(Progress.user_id==session['uid'])
        passage_date=Content.data['date'].as_string()
        weekly=q.filter(passage_date>=week.isoformat(),passage_date<=today.isoformat()).count()
        monthly=q.filter(passage_date>=today.replace(day=1).isoformat(),passage_date<=today.isoformat()).count()
        return jsonify(items=[{'reading_id':r.reading_id,'completed_at':r.completed_at.isoformat()} for r in rows],weekly=weekly,monthly=monthly)

    @app.put('/api/progress/<int:id>')
    @auth()
    def set_progress(id):
        Content.query.filter(Content.id==id,Content.module=='reading',visible()).first_or_404()
        p=payload()
        if not isinstance(p.get('completed'),bool): fail('Completion must be true or false.')
        r=Progress.query.filter_by(user_id=session['uid'],reading_id=id).first()
        if p['completed'] and not r: db.session.add(Progress(user_id=session['uid'],reading_id=id))
        if not p['completed'] and r: db.session.delete(r)
        db.session.commit(); return jsonify(ok=True)

    @app.get('/api/admin/overview')
    @auth('admin','editor','prayer')
    def overview():
        u=db.session.get(User,session['uid'])
        counts=dict.fromkeys(MODULES,0) if u.role in ['admin','editor'] else {}
        if counts: counts.update(dict(db.session.query(Content.module,func.count(Content.id)).group_by(Content.module).all()))
        if u.role in ['admin','prayer']: counts['prayer']=Prayer.query.count()
        if u.role=='admin': counts.update(contact=Enquiry.query.count(),registrations=Registration.query.count(),users=User.query.count())
        return jsonify(counts=counts)

    @app.get('/api/admin/content/<module>')
    @auth('admin','editor')
    def admin_content(module):
        if module not in MODULES: fail('Module not found.',404)
        q=Content.query.filter_by(module=module)
        search=request.args.get('q','')[:200]
        if search: q=q.filter(db.or_(Content.title_en.contains(search),Content.title_ta.contains(search)))
        status=request.args.get('status','')
        if status: q=q.filter_by(status=status)
        try: page=max(1,int(request.args.get('page',1)))
        except ValueError: fail('Invalid page.')
        return jsonify(items=[r.public() for r in q.order_by(Content.sort_order,Content.id.desc()).offset((page-1)*20).limit(20)],total=q.count())

    @app.post('/api/admin/content/<module>')
    @auth('admin','editor')
    def add_content(module):
        if module not in MODULES: fail('Module not found.',404)
        r=Content(module=module,**validate_content(payload(),module)); db.session.add(r); db.session.flush(); log('content.create',r.id); db.session.commit(); return jsonify(r.public()),201

    @app.route('/api/admin/content/item/<int:id>',methods=['PUT','DELETE'])
    @auth('admin','editor')
    def edit_content(id):
        r=db.get_or_404(Content,id)
        if request.method=='DELETE':
            if payload().get('confirm') is not True: fail('Deletion confirmation required.')
            # Explicit cleanup also works in the SQLite development database.
            Progress.query.filter_by(reading_id=id).delete(); Registration.query.filter_by(event_id=id).delete()
            Content.query.filter_by(parent_id=id).update({'parent_id':None})
            db.session.delete(r); log('content.delete',id)
        else:
            for k,v in validate_content(payload(),r.module).items(): setattr(r,k,v)
            log('content.update',id)
        db.session.commit(); return jsonify(ok=True)

    private_models={'prayer':Prayer,'contact':Enquiry,'registrations':Registration,'audit':Audit,'users':User}
    @app.get('/api/admin/private/<module>')
    @auth('admin','prayer')
    def private_list(module):
        if module not in private_models: fail('Not found.',404)
        u=db.session.get(User,session['uid'])
        if u.role!='admin' and module!='prayer': fail('Access denied.',403)
        try: page=max(1,int(request.args.get('page',1)))
        except ValueError: fail('Invalid page.')
        model=private_models[module]; q=model.query
        if request.args.get('status') and hasattr(model,'status'): q=q.filter_by(status=request.args['status'])
        search=request.args.get('q','')[:200]
        columns=[getattr(model,k) for k in ['name','email','contact','action','title_en'] if hasattr(model,k)]
        if search and columns: q=q.filter(db.or_(*[column.contains(search) for column in columns]))
        rows=q.order_by(model.id.desc()).offset((page-1)*20).limit(20).all()
        log('private.view',module); db.session.commit()
        def serialize(r):
            return {c.name:(getattr(r,c.name).isoformat() if isinstance(getattr(r,c.name),datetime) else getattr(r,c.name)) for c in r.__table__.columns if c.name!='password_hash'}
        return jsonify(items=[serialize(r) for r in rows],total=q.count())

    @app.route('/api/admin/private/<module>/<int:id>',methods=['PUT','DELETE'])
    @auth('admin','prayer')
    def private_update(module,id):
        u=db.session.get(User,session['uid'])
        if module not in ['prayer','contact','registrations'] or (u.role!='admin' and module!='prayer'): fail('Access denied.',403)
        r=db.get_or_404(private_models[module],id); p=payload()
        if request.method=='DELETE':
            if p.get('confirm') is not True: fail('Confirmation required.')
            db.session.delete(r)
        else:
            if module=='registrations' or p.get('status') not in ['New','In Progress','Completed']: fail('Invalid status.')
            r.status=p['status']
        log('private.'+request.method.lower(),f'{module}:{id}'); db.session.commit(); return jsonify(ok=True)

    @app.route('/api/admin/users',methods=['POST'])
    @auth('admin')
    def create_user():
        p=payload(); email=string(p,'email',254,True).lower(); password=string(p,'password',256,True); role=p.get('role')
        if role not in ['admin','editor','prayer','member'] or len(password)<12 or not re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+',email): fail('Invalid user details.')
        r=User(email=email,password_hash=generate_password_hash(password),role=role); db.session.add(r)
        try: db.session.flush(); log('user.create',r.id); db.session.commit()
        except IntegrityError: db.session.rollback(); fail('Email already in use.',409)
        return jsonify(ok=True),201

    @app.put('/api/admin/users/<int:id>')
    @auth('admin')
    def user_role(id):
        r=db.get_or_404(User,id); p=payload(); role=p.get('role')
        if role not in ['admin','editor','prayer','member']: fail('Invalid role.')
        if r.role=='admin' and role!='admin' and User.query.filter_by(role='admin').count()==1: fail('Keep at least one administrator.')
        r.role=role; log('user.role',id); db.session.commit(); return jsonify(ok=True)

    @app.post('/api/admin/uploads')
    @auth('admin','editor')
    def upload():
        f=request.files.get('file')
        if not f: fail('Select an image.')
        try:
            im=Image.open(f.stream)
            if im.format not in ['JPEG','PNG','WEBP'] or im.width*im.height>20000000: fail('Use a JPEG, PNG or WebP up to 20 megapixels.')
            im.load(); im.thumbnail((2000,2000)); im=im.convert('RGB')
        except (UnidentifiedImageError,OSError,Image.DecompressionBombError): fail('Invalid image.')
        folder=Path(app.config['UPLOAD_FOLDER']); folder.mkdir(parents=True,exist_ok=True)
        name=uuid.uuid4().hex+'.webp'; im.save(folder/name,'WEBP',quality=85)
        log('image.upload',name); db.session.commit(); return jsonify(url='/uploads/'+name),201

    @app.get('/uploads/<name>')
    def uploaded(name):
        if not re.fullmatch(r'[a-f0-9]{32}\.webp',name): fail('Not found.',404)
        return send_from_directory(app.config['UPLOAD_FOLDER'],name)

    @app.get('/robots.txt')
    def robots(): return 'User-agent: *\nDisallow: /admin\nDisallow: /api/\nSitemap: '+os.getenv('PUBLIC_ORIGIN',request.host_url.rstrip('/'))+'/sitemap.xml',200,{'Content-Type':'text/plain'}

    @app.get('/sitemap.xml')
    def sitemap():
        from xml.sax.saxutils import escape
        origin=escape(os.getenv('PUBLIC_ORIGIN',request.host_url.rstrip('/')))
        routes=['','about','sermons','events','verses','reading','studies','photos','videos','articles','messages','faqs','prayer','contact']
        return '<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+''.join(f'<url><loc>{origin}/{r}</loc></url>' for r in routes)+'</urlset>',200,{'Content-Type':'application/xml'}

    @app.get('/')
    @app.get('/<path:path>')
    def spa(path=''):
        if path.startswith(('api/','uploads/')): fail('Not found.',404)
        root=Path(app.static_folder)
        if path and (root/path).is_file(): return send_from_directory(root,path)
        return send_from_directory(root,'index.html')

    @app.cli.command('setup-admin')
    @click.option('--email',prompt=True)
    @click.password_option(confirmation_prompt=True)
    def setup_admin(email,password):
        if User.query.filter_by(role='admin').first(): raise click.ClickException('Administrator already exists. Use the dashboard.')
        if len(password)<12 or not re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+',email): raise click.ClickException('Valid email and 12-character password required.')
        db.session.add(User(email=email.lower(),password_hash=generate_password_hash(password),role='admin')); db.session.commit(); click.echo('Administrator created.')

    @app.cli.command('purge-private')
    @click.option('--days',default=90,type=click.IntRange(min=30))
    @click.option('--confirm',is_flag=True)
    def purge(days,confirm):
        if not confirm: raise click.ClickException('Use --confirm after reviewing your retention policy.')
        cutoff=datetime.now(timezone.utc)-timedelta(days=days)
        count=Prayer.query.filter(Prayer.created_at<cutoff,Prayer.status=='Completed').delete()+Enquiry.query.filter(Enquiry.created_at<cutoff,Enquiry.status=='Completed').delete()
        db.session.commit(); click.echo(f'Removed {count} completed requests.')
    return app

if __name__=='__main__':
    create_app().run(host='127.0.0.1',port=5000)
