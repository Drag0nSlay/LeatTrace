import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Configurable database urls, fallback to local sqlite database file
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./leatrace.db")

# Use special connect args for SQLite (enforcing thread safety exceptions)
connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Dependency to get db session in FastAPI routes
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- MongoDB Configuration (NoSQL) ---
mongo_db = None
mongo_client = None

try:
    import pymongo
    mongo_url = os.getenv("MONGO_URL", "mongodb://localhost:27017")
    mongo_client = pymongo.MongoClient(mongo_url, serverSelectionTimeoutMS=2000)
    mongo_db = mongo_client[os.getenv("MONGO_DB_NAME", "leatrace_nosql")]
except Exception:
    pass

class MockMongoCollection:
    def insert_one(self, document):
        return type('Obj', (object,), {'inserted_id': 'mock-id'})()
    def find_one(self, filter):
        return None

class MockMongoDB:
    def __getitem__(self, name):
        return MockMongoCollection()

def get_mongo_db():
    if mongo_db is not None:
        try:
            mongo_client.server_info()
            return mongo_db
        except Exception:
            pass
    return MockMongoDB()

# --- Redis Configuration (Caching) ---
redis_client = None

try:
    import redis
    redis_host = os.getenv("REDIS_HOST", "localhost")
    redis_port = int(os.getenv("REDIS_PORT", 6379))
    redis_client = redis.Redis(host=redis_host, port=redis_port, db=0, socket_timeout=0.5, socket_connect_timeout=0.5)
except Exception:
    pass

class MockRedis:
    def __init__(self):
        self.store = {}
    def set(self, key, value, ex=None):
        self.store[key] = value
        return True
    def get(self, key):
        return self.store.get(key)
    def expire(self, key, time):
        return True

def get_redis_client():
    if redis_client is not None:
        return redis_client
    return MockRedis()
