from flask import Flask, request, session, render_template, send_from_directory, jsonify, abort, url_for

import json, uuid, requests, os, heapq, bson, pymongo, time, datetime
from bson.objectid import ObjectId
from werkzeug.utils import secure_filename

app = Flask(__name__, static_url_path = '/static')
app.secret_key = '(514o^3"Q70<@30kW.]byVc83LhECZ' 
# lol not so secret anymore

ALLOWED_EXTENSIONS = set(['png', 'jpg', 'jpeg'])
app.config['UPLOAD_FOLDER'] = '/static/img'

import bundles
bundles.run(app)

def allowed_file(filename):
  return '.' in filename and \
    filename.rsplit('.', 1)[1] in ALLOWED_EXTENSIONS

@app.route('/api/ocr/', methods=['POST'])
def upload_file():
  if 'file' not in request.files:
    return JSONResponse(False, data = 'No file part')
  file = request.files['file']
  f = request.files['file']
  f.seek(0)
  sendFile = {"file": (f.filename, f.stream, f.mimetype)}
  headers = {
    os.environ['COGS120_VISION_HEADER']: os.environ['COGS120_VISION_KEY']
  }
  r = requests.post(os.environ['COGS120_VISION_ENDPOINT'], files=sendFile, headers=headers)
  data = r.json()
  words = list()

  for region in data['regions']:
    for line in region['lines']:
      text = line['words']
      for box in text:
        words.append(box['text'] + ' ')
      # words.append('\n')
    words.append('\n')
  return JSONResponse(True, data=''.join(words))

def editDistance(s1, s2):
  # transform the two strings to lowercase and no spaces for better matching :)
  s1 = ''.join(s1.split()).lower()
  s2 = ''.join(s2.split()).lower()

  # ripped from 
  # http://stackoverflow.com/questions/2460177/edit-distance-in-python
  m = len(s1)+1
  n = len(s2)+1

  tbl = {}
  for i in range(m): tbl[i,0]=i
  for j in range(n): tbl[0,j]=j
  for i in range(1, m):
    for j in range(1, n):
      cost = 0 if s1[i-1] == s2[j-1] else 1
      tbl[i,j] = min(tbl[i, j-1]+1, tbl[i-1, j]+1, tbl[i-1, j-1]+cost)

  return tbl[i,j]

def dissimilar(name, term):
  name = ''.join(name.split()).lower()
  term = ''.join(term.split()).lower()
  nameChars = set(name)
  termChars = set(term)
  notInCounter = 0
  for x in termChars:
    if x not in nameChars:
      notInCounter += 1
  if 1.0*notInCounter / len(nameChars) > 0.25:
    return True
  return False

def search(term, iterable, fieldFunction, resultFunction, limit = 10):
  results = list()

  if limit != None and term != None and term != '':
    minHeap = list()
    for obj in iterable:
      name = fieldFunction(obj)
      if not dissimilar(name, term):
        dist = editDistance(term, name)
        if 1.0*dist / max(len(term), len(name)) < 0.9:
          heapq.heappush(minHeap, (dist, obj))
    for index in xrange(limit):
      if not minHeap:
        break
      (distance, obj) = heapq.heappop(minHeap)
      results.append(resultFunction(obj))
    return results
  else:
    for obj in iterable:
      results.append(resultFunction(obj))
    return results

def cacheSet(db, collectionName, operation, cacheKey, result):
  compoundKey = '-'.join([collectionName, operation, cacheKey])
  db.Cache.update(
      {
        'compoundKey': compoundKey
      }, 
      {'$set': {
        'compoundKey': compoundKey,
        'value': result
      }}, 
      upsert = True
    )

def cacheGet(db, collectionName, operation, cacheKey):
  compoundKey = '-'.join([collectionName, operation, cacheKey])
  cacheCursor = db.Cache.find({
      'compoundKey': compoundKey
    }).limit(1)
  for cursor in cacheCursor:
    return cursor['value']

def cacheRemove(db, collectionName, operation, cacheKey):
  compoundKey = '-'.join([collectionName, operation, cacheKey])
  cacheCursor = db.Cache.remove({
      'compoundKey': compoundKey
    })

def flattenMongoObj(db, obj):
  output = dict()
  for key in obj:
    idString = key[-2:]
    objString = key[:-2]
    if idString == 'Id':
      keyId = str(obj[key])
      output[objString] = flattenMongoObj(
          db,
          list(db[objString].find({
            '_id': ObjectId(keyId)
          }).limit(1))[0]
        )
      output[key] = keyId
    elif key != '_id':
      output[key] = obj[key]
    else:
      output[key] = str(obj[key])
  return output

def flattenMongoCursor(db, collectionName, cursor, cache = True):
  results = list()
  links = list(cursor)
  now = datetime.datetime.utcnow()
  for link in links:
    if cache:
      cacheKey = str(link['_id'])
      cacheResult = cacheGet(db, collectionName, 'flatten', cacheKey)
      if cacheResult != None:
        results.append(cacheResult)
      else:
        result = flattenMongoObj(db, link)
        cacheSet(db, collectionName, 'flatten', cacheKey, result)
        results.append(result)
    else:
      results.append(flattenMongoObj(db, link))

  return results

def JSONResponse(success, data = None):
  return jsonify({
      'success': success,
      'data': data
    })

def getMongoConnection():
  mongolab_uri = 'mongodb://%s:%s@ds143767.mlab.com:43767/joe' % (
      os.environ['COGS120_MLAB_USERNAME'], 
      os.environ['COGS120_MLAB_PASSWORD']
    )
  connection = pymongo.MongoClient(host=mongolab_uri)
  db = connection['joe']
  return (connection, db) # local version

def getJSON():
  with open('data.json', 'r+') as f:
    return json.load(f)

def writeJSON(data):
  with open('data.json', 'r+') as f:
    f.seek(0)
    f.write(json.dumps(data))
    f.truncate()

@app.errorhandler(404)
def page_not_found(e):
  return render_template('404.html'), 404

@app.route('/', methods = ['GET'])
def appLanding():
  return render_template('app.html', TESTING_OPTION='A')

@app.route('/A/', methods = ['GET'])
def appLandingA():
  return render_template('app.html', TESTING_OPTION='A')

@app.route('/B/', methods = ['GET'])
def appLandingB():
  return render_template('app.html', TESTING_OPTION='B')

@app.route('/api/login/', methods = ['POST'])
def apiLogin():
  data = json.loads(request.data)
  email = str(data['UCSDEmailAddress'])
  password = str(data['Password'])
  (connection, db) = getMongoConnection()
  userCursor = list(db.UserObject.find({
      'UCSDEmailAddress': email,
      'Password': password
    }).limit(1))
  connection.close()
  if userCursor:
    return JSONResponse(True, data={
        'userId': str(userCursor[0]['_id'])
      })
  else:
    return JSONResponse(False)

@app.route('/api/class/follow/', methods = ['POST'])
def apiClassFollow():
  data = json.loads(request.data)
  (connection, db) = getMongoConnection()
  userId = str(data['userId'])
  classInstanceLinkId = str(data['classInstanceLinkId'])
  db.UserClassInstanceLink.update({
      'UserObjectId': userId,
      'ClassInstanceLinkId': classInstanceLinkId
    }, {'$set': {
      'UserObjectId': userId,
      'ClassInstanceLinkId': classInstanceLinkId
    }}, upsert = True)
  cacheRemove(db, 'UserClassInstanceLink', 'getMyClassesList', userId)
  cacheRemove(db, 'ClassInstanceLink', 'getMyClassesList', userId)
  cacheRemove(db, 'ClassInstanceLink', 'flattenClassInstanceLinksIn', userId)
  cacheRemove(db, 'ClassInstanceLink', 'flattenClassInstanceLinksNotIn', userId)
  getMyClassInstanceLinkList(db, userId)
  connection.close()
  return JSONResponse(True)

@app.route('/api/class/unfollow/', methods = ['POST'])
def apiClassUnfollow():
  data = json.loads(request.data)
  (connection, db) = getMongoConnection()
  userId = str(data['userId'])
  classInstanceLinkId = str(data['classInstanceLinkId'])
  db.UserClassInstanceLink.remove({
      'UserObjectId': userId,
      'ClassInstanceLinkId': classInstanceLinkId
    })
  cacheRemove(db, 'UserClassInstanceLink', 'getMyClassesList', userId)
  cacheRemove(db, 'ClassInstanceLink', 'getMyClassesList', userId)
  cacheRemove(db, 'ClassInstanceLink', 'flattenClassInstanceLinksIn', userId)
  cacheRemove(db, 'ClassInstanceLink', 'flattenClassInstanceLinksNotIn', userId)
  getMyClassInstanceLinkList(db, userId)
  connection.close()
  return JSONResponse(True)

@app.route('/api/class/get-notes/', methods = ['POST'])
def apiGetNotes():
  data = json.loads(request.data)
  classInstanceLinkId = str(data['classInstanceLinkId'])
  (connection, db) = getMongoConnection()
  cacheResult = cacheGet(db, 'NoteClassInstanceLink', 'getAllNotes', classInstanceLinkId)
  if cacheResult != None:
    notes = cacheResult
  else:
    noteClassInstanceCursor = db.NoteClassInstanceLink.find({
        'ClassInstanceLinkId': classInstanceLinkId
      })
    noteObjectIds = list()
    for link in noteClassInstanceCursor:
      noteObjectIds.append(ObjectId(link['NoteObjectId']))

    noteObjectCursor = db.NoteObject.find({
        '_id': {
          '$in': noteObjectIds
        }
      })
    for note in noteObjectCursor:
      noteId = note['_id']
      db.NoteObject.update(
          {
            '_id': noteId
          }, 
          {'$set': {
            'LikeCount': db.LikeObject.count({
                'NoteObjectId': str(noteId)
              })
          }}
        )
    noteObjectCursor = db.NoteObject.find({
        '_id': {
          '$in': noteObjectIds
        }
      }).sort([('Week', pymongo.ASCENDING), ('LikeCount', pymongo.DESCENDING)])
    notes = flattenMongoCursor(db, 'NoteObject', noteObjectCursor, cache = True)
    cacheSet(db, 'NoteClassInstanceLink', 'getAllNotes', 'all', notes)
  connection.close()
  return JSONResponse(True, data = notes)

@app.route('/api/notifications/', methods = ['POST'])
def getNotifications():
  data = json.loads(request.data)
  userId = str(data['userId'])

  (connection, db) = getMongoConnection()
  result = cacheGet(db, 'ClassInstanceLink', 'flattenNotifications', userId)
  if result != None:
    now = datetime.datetime.utcnow()
    if now - datetime.timedelta(seconds=10) < result['CreatedAt']:
      return JSONResponse(True, data = result['data'])

  links = map(str, getMyClassInstanceLinkList(db, userId))
  results = list(db.Notification.find({
      'ClassInstanceLinkId': {
        '$in': links
      },
      'UserObjectId': {
        '$ne': ObjectId(userId)
      }
    }).sort(
      'CreatedAt', pymongo.DESCENDING
    ).limit(20))
  notifications = flattenMongoCursor(db, 'Notifications', results, cache = True)
  cacheSet(db, 'Notifications', 'flattenNotifications', userId, {
      'CreatedAt': datetime.datetime.utcnow(),
      'data': notifications
    })
  connection.close()
  return JSONResponse(True, data = notifications)

def getMyClassInstanceLinkList(db, userId):
  cacheResult = cacheGet(db, 'UserClassInstanceLink', 'getMyClassesList', userId)
  if cacheResult != None:
    return cacheResult
  userClassLinkCursor = db.UserClassInstanceLink.find({
      'UserObjectId': userId
    })
  classInstanceLinkIds = list()
  for link in userClassLinkCursor:
    classInstanceLinkIds.append(ObjectId(link['ClassInstanceLinkId']))
  cacheSet(db, 'UserClassInstanceLink', 'getMyClassesList', userId, classInstanceLinkIds)
  return classInstanceLinkIds

@app.route('/api/class/get-all/', methods = ['POST'])
def apiClassGetAll():
  data = json.loads(request.data)
  userId = str(data['userId'])
  isSearchingMyClasses = data['isSearchingMyClasses']
  (connection, db) = getMongoConnection()
  cacheResult = cacheGet(db, 'ClassInstanceLink', 'flattenClassInstanceLinks' + ('In' if isSearchingMyClasses else 'NotIn'), userId)
  if cacheResult != None:
    links = cacheResult
  else:
    classInstanceLinkIds = getMyClassInstanceLinkList(db, userId)
    if isSearchingMyClasses:
      linkCursor = db.ClassInstanceLink.find({
          '_id': {
            '$in': classInstanceLinkIds
          }
        })
    else:
      linkCursor = db.ClassInstanceLink.find({
          '_id': {
            '$nin': classInstanceLinkIds
          }
        })
    links = flattenMongoCursor(db, 'ClassInstanceLink', linkCursor, cache = True)
    cacheSet(db, 'ClassInstanceLink', 'flattenClassInstanceLinks' + ('In' if isSearchingMyClasses else 'NotIn'), userId, links)
  connection.close()
  result = search(
    None, 
    links, 
    lambda obj: obj['ClassObject']['Name'], 
    lambda obj: {
      'ClassName': obj['ClassObject']['Name'],
      'InstructorName': obj['InstructorObject']['Name'],
      'ClassId': obj['ClassObject']['_id'],
      'ClassInstanceLinkId': obj['_id'],
      'Unique': datetime.datetime.now()
    }, 
    limit = None
  )
  return JSONResponse(True, data = result)

@app.route('/api/class/search/', methods = ['POST'])
def apiClassSearch():
  data = json.loads(request.data)
  userId = str(data['userId'])
  term = str(data['term'])
  isSearchingMyClasses = data['isSearchingMyClasses']
  (connection, db) = getMongoConnection()
  cacheResult = cacheGet(db, 'ClassInstanceLink', 'flattenClassInstanceLinks' + ('In' if isSearchingMyClasses else 'NotIn'), userId)
  if cacheResult != None:
    links = cacheResult
  else:
    classInstanceLinkIds = getMyClassInstanceLinkList(db, userId)
    if isSearchingMyClasses:
      linkCursor = db.ClassInstanceLink.find({
          '_id': {
            '$in': classInstanceLinkIds
          }
        })
    else:
      linkCursor = db.ClassInstanceLink.find({
          '_id': {
            '$nin': classInstanceLinkIds
          }
        })
    links = flattenMongoCursor(db, 'ClassInstanceLink', linkCursor, cache = True)
    cacheSet(db, 'ClassInstanceLink', 'flattenClassInstanceLinks' + ('In' if isSearchingMyClasses else 'NotIn'), userId, links)
  connection.close()
  result = search(
    term, 
    links, 
    lambda obj: obj['ClassObject']['Name'], 
    lambda obj: {
      'ClassName': obj['ClassObject']['Name'],
      'InstructorName': obj['InstructorObject']['Name'],
      'ClassId': obj['ClassObject']['_id'],
      'ClassInstanceLinkId': obj['_id']
    }, 
    limit = 10
  )
  return JSONResponse(True, data = result)

@app.route('/api/settings/', methods = ['POST'])
def apiGetSettings():
  (connection, db) = getMongoConnection()
  data = json.loads(request.data)
  userId = str(data['userId'])
  user = db.UserObject.find_one({'_id': ObjectId(userId)})
  result = {
      'FirstName': str(user['FirstName']),
      'LastName': str(user['LastName']),
      'UCSDEmailAddress': str(user['UCSDEmailAddress'])
    }
  connection.close()
  return JSONResponse(True, data = result)

@app.route('/api/notes/is-created/', methods = ['POST'])
def apiIsNoteCreated():
  (connection, db) = getMongoConnection()
  data = json.loads(request.data)
  userId = str(data['userId'])
  noteId = str(data['noteId'])
  isCreated = db.NoteObject.count({
      'UserObjectId': userId,
      '_id': ObjectId(noteId)
    }) > 0
  connection.close()
  return JSONResponse(True, data = isCreated)

@app.route('/api/notes/is-liked/', methods = ['POST'])
def apiIsNoteLiked():
  (connection, db) = getMongoConnection()
  data = json.loads(request.data)
  userId = str(data['userId'])
  noteId = str(data['noteId'])
  likeObject = list(db.LikeObject.find({
      'UserObjectId': userId, 
      'NoteObjectId': noteId
    }).limit(1))
  isLiked = False
  if likeObject and likeObject[0]['Active']:
    isLiked = True
  connection.close()
  return JSONResponse(True, data = isLiked)

@app.route('/api/notes/change-like/', methods = ['POST'])
def apiNoteChangeLike():
  data = json.loads(request.data)
  userId = str(data['userId'])
  noteId = str(data['noteId'])
  delta = data['delta']
  (connection, db) = getMongoConnection()
  db.LikeObject.update(
      {
        'UserObjectId': userId,
        'NoteObjectId': noteId
      }, 
      {'$set': {
        'UserObjectId': userId,
        'NoteObjectId': noteId,
        'Active': delta
      }}, 
      upsert = True
    )
  connection.close()
  return JSONResponse(True)

@app.route('/api/notes/delete/', methods = ['POST'])
def apiNoteDelete():
  (connection, db) = getMongoConnection()
  data = json.loads(request.data)
  userId = str(data['userId'])
  noteId = str(data['noteId'])
  db.NoteObject.remove({
    '_id': ObjectId(noteId)
  })
  ids = list()
  noteClassInstanceLinkCursor = db.NoteClassInstanceLink.find({
    'NoteObjectId': noteId
  })
  for note in noteClassInstanceLinkCursor:
    ids.append(note['ClassInstanceLinkId'])
  db.NoteClassInstanceLink.remove({
    'NoteObjectId': noteId
  })
  db.Notification.remove({
    'NoteObjectId': noteId
  })
  db.LikeObject.remove({
    'NoteObjectId': noteId
  })
  db.Notification.remove({
    'NoteObjectId': noteId
  })
  for idString in ids:
    cacheRemove(db, 'NoteClassInstanceLink', 'getAllNotes', idString)
  connection.close()
  return JSONResponse(True)


@app.route('/api/notes/create/', methods = ['POST'])
def createNote():
  data = json.loads(request.data)
  userId = str(data['userId'])
  week = int(data['Week'])
  name = str(data['Name'])
  body = str(data['Body'])
  classInstanceLinkId = str(data['ClassInstanceLinkId'])
  (connection, db) = getMongoConnection()
  newNoteObjectId = db.NoteObject.insert({
    'Week': week,
    'Name': name,
    'Body': body,
    'UserObjectId': userId
  })
  db.NoteClassInstanceLink.insert({
    'NoteObjectId': str(newNoteObjectId),
    'ClassInstanceLinkId': classInstanceLinkId
  })
  db.Notification.insert({
    'ClassInstanceLinkId': classInstanceLinkId,
    'UserObjectId': userId,
    'NoteObjectId': str(newNoteObjectId),
    'CreatedAt': datetime.datetime.utcnow()
  })
  cacheRemove(db, 'NoteClassInstanceLink', 'getAllNotes', classInstanceLinkId)
  connection.close()
  return JSONResponse(True)

@app.route('/api/extract-text/', methods = ['POST'])
def extractText():
  headers = {
    'Content-Type': 'application/octet-stream',
    os.environ['COGS120_VISION_HEADER']: os.environ['COGS120_VISION_KEY']
  }
  print request.form['data']
  #r = requests.post(os.environ['COGS120_VISION_ENDPOINT'], headers=headers, #data=request.form['data'])
  #print r
  #print r.json()

  return JSONResponse(True)

if __name__ == '__main__':
  app.run(host='0.0.0.0', port='5000', threaded=True)