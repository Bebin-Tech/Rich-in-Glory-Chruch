"""Import verified listing information without replacing church-managed records."""
from backend.app import create_app, db, Settings, Content
SOURCE='https://share.google/k6B7S0qJbvH2AITGG'
app=create_app()
with app.app_context():
    settings=db.session.get(Settings,1)
    if not settings:
        settings=Settings(id=1,data={}); db.session.add(settings)
    values=dict(settings.data or {})
    for key,value in {'address':'2395+JJW, Mahakavi Nagar, Irugur, Tamil Nadu 641103','maps':SOURCE,'hero_image':'/church/church-family.jpg'}.items():
        if not values.get(key): values[key]=value
    settings.data=values
    def add(module,key,**fields):
        existing=Content.query.filter_by(module=module).all()
        if any((r.data or {}).get('source_key')==key for r in existing): return
        metadata=fields.pop('data',{})
        db.session.add(Content(module=module,status='published',data={**metadata,'source_key':key,'source_url':SOURCE},**fields))
    add('about','google-irugur-about',title_en='A church family in Irugur',title_ta='இருகூரில் ஒரு சபை குடும்பம்',body_en='Welcome to Rich in Glory Church, also listed as மகிமையின் ஐசுவரியம் ஜெப ஆலயம். You can find us in Mahakavi Nagar, Irugur, Tamil Nadu.\n\nOur Google Maps listing gives the address as 2395+JJW, Mahakavi Nagar, Irugur, Tamil Nadu 641103. Please contact the church to confirm current service times before your visit.',body_ta='மகிமையின் ஐசுவரியம் ஜெப ஆலயம் — Rich in Glory Church உங்களை வரவேற்கிறது. தமிழ்நாடு, இருகூர், மகாகவி நகரில் எங்களைச் சந்திக்கலாம்.\n\nமுகவரி: 2395+JJW, மகாகவி நகர், இருகூர், தமிழ்நாடு 641103. வருகைக்கு முன் தற்போதைய ஆராதனை நேரங்களை சபையிடம் உறுதிப்படுத்துங்கள்.')
    photos=[('worship','Together in His presence','அவரது பிரசன்னத்தில் ஒன்றாய்','Worship gathering at Rich in Glory Church.','மகிமையின் ஐசுவரியம் சபையின் ஆராதனை கூடுகை.','John Prince Raj','2022-01'),('fellowship','Faith brings us together','விசுவாசத்தில் ஒன்றிணைகிறோம்','A moment of fellowship from the church’s Google Maps photo collection.','சபையின் Google Maps புகைப்படத் தொகுப்பிலிருந்து ஓர் ஐக்கியத் தருணம்.','RICHIN GRACE DANIEL','2022-09'),('church-family','Our church family','எங்கள் சபை குடும்பம்','A church family gathering in Irugur.','இருகூரில் சபை குடும்பத்தின் கூடுகை.','RICHIN GRACE DANIEL','2022-09')]
    for order,(name,en,ta,body,bta,credit,month) in enumerate(photos):
        add('photos','google-photo-'+name,title_en=en,title_ta=ta,body_en=body,body_ta=bta,sort_order=order,category='Church life',data={'image':'/church/'+name+'.jpg','credit':credit,'captured_month':month})
    db.session.commit()
    print('Verified church location and three credited photographs imported.')
