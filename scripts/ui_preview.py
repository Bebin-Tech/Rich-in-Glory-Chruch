"""Disposable browser QA server. All records are synthetic and held in memory."""
import os, sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from backend.app import create_app, db, User, Content, Prayer, church_today
from werkzeug.security import generate_password_hash
from waitress import serve
os.environ['PUBLIC_ORIGIN']='http://127.0.0.1:5001'
app=create_app({'SECRET_KEY':'disposable-ui-test-only','SQLALCHEMY_DATABASE_URI':'sqlite://','SESSION_COOKIE_SECURE':False,'RATELIMIT_ENABLED':False,'TESTING':True})
with app.app_context():
    db.create_all()
    db.session.add(User(email='ui-admin@example.test',password_hash=generate_password_hash('UI-Test-Only-123!'),role='admin'))
    for m,metadata in {'sermons':{'reference':'John 1','date':church_today().isoformat(),'preacher':'Sample preacher'},'events':{'date':'2099-01-01','time':'10:00','venue':'Sample venue','registration':True},'reading':{'date':church_today().isoformat(),'reference':'John 1'},'studies':{'book':'John','chapter':'1','questions':'What can we learn about faith?'},'articles':{'author':'Sample author','date':church_today().isoformat()},'faqs':{},'messages':{'important':True}}.items():
        db.session.add(Content(module=m,title_en='Sample — '+m,title_ta='மாதிரி பதிவு',body_en='Synthetic content for browser verification only. This is not church information.',body_ta='இது சோதனைக்கான மாதிரி பதிவு. சபையின் உண்மையான தகவல் அல்ல.',status='published',category='Sample',data=metadata))
    db.session.add(Prayer(name='Sample visitor',contact='',message='Synthetic prayer request for testing.',consent=True))
    db.session.commit()
print('Disposable QA server: http://127.0.0.1:5001 (synthetic data only)')
serve(app,host='127.0.0.1',port=5001)
