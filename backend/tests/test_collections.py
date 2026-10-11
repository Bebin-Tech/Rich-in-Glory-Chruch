from test_app import app, client, send, login, add

def test_event_period_and_album_filter(client):
    login(client)
    add(client,'events',data={'date':'2001-01-01'})
    add(client,'events',data={'date':'2099-01-01'})
    assert client.get('/api/content/events?period=upcoming').json['total']==1
    assert client.get('/api/content/events?period=past').json['total']==1
    album=add(client,'albums').json
    add(client,'photos',parent_id=album['id'])
    add(client,'photos')
    assert client.get('/api/content/photos?album='+str(album['id'])).json['total']==1

def test_future_verse_hidden_and_featured_filter(client):
    login(client)
    add(client,'verses',data={'month':'2099-01','reference':'John 1','translation':'Test only','rights_confirmed':True})
    assert client.get('/api/content/verses').json['total']==0
    add(client,'sermons',data={'featured':True})
    add(client,'sermons')
    assert client.get('/api/content/sermons?featured=true').json['total']==1
