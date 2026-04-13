from redis import Redis
from rq import Queue

from app.core.config import settings


def get_queue() -> Queue:
    connection = Redis.from_url(settings.redis_url)
    return Queue(settings.redis_queue_name, connection=connection)
