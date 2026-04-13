from redis import Redis
from rq import Connection, Worker

from app.core.config import settings


def main() -> None:
    connection = Redis.from_url(settings.redis_url)
    with Connection(connection):
        worker = Worker([settings.redis_queue_name])
        worker.work()


if __name__ == "__main__":
    main()
