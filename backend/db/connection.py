from pymongo import MongoClient
from config import MONGO_URI, MONGO_DB

_client = None

def get_client():
    global _client
    if _client is None:
        _client = MongoClient(MONGO_URI)
    return _client

def get_db():
    return get_client()[MONGO_DB]

def col(name: str):
    return get_db()[name]
