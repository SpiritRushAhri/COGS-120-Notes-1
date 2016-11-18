import pymongo, os

def getMongoConnection():
  mongolab_uri = 'mongodb://%s:%s@ds143767.mlab.com:43767/joe' % (
      os.environ['COGS120_MLAB_USERNAME'], 
      os.environ['COGS120_MLAB_PASSWORD']
    )
  connection = pymongo.MongoClient(host=mongolab_uri)
  db = connection['joe']
  return (connection, db) # local version

classObjects = [
  {
    'ClassName': 'COGS 1',
    'InstructorName': 'Bradley Voytek'
  },
  {
    'ClassName': 'COGS 9',
    'InstructorName': 'Bradley Voytek'
  },
  {
    'ClassName': 'COGS 14A',
    'InstructorName': 'Federico Rossano'
  },
  {
    'ClassName': 'COGS 14B',
    'InstructorName': 'Esther Walker'
  },
  {
    'ClassName': 'COGS 101A',
    'InstructorName': 'Steven Barrera'
  },
  {
    'ClassName': 'COGS 174',
    'InstructorName': 'Jaime Pineda'
  }

]

(connection, db) = getMongoConnection()

for classObject in classObjects:
  ClassObjectId = db.ClassObject.insert({
      'Name': classObject['ClassName']  
    })

  InstructorObjectId = db.InstructorObject.insert({
      'Name': classObject['InstructorName']  
    })

  ClassInstanceLinkId = db.ClassInstanceLink.insert({
      'ClassObjectId': ClassObjectId,
      'InstructorObjectId': InstructorObjectId
    })

db.drop_collection('Cache')

connection.close()