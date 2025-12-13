from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
from app.models import Base

# 创建数据库引擎
# 根据数据库类型选择不同的连接参数
if settings.DATABASE_URL.startswith("postgresql"):
    engine = create_engine(
        settings.DATABASE_URL,
        pool_pre_ping=True,
        pool_recycle=300,
        echo=True
    )
else:
    # SQLite 配置
    engine = create_engine(
        settings.DATABASE_URL,
        connect_args={"check_same_thread": False},
        echo=True
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 创建数据库表
def create_tables():
    Base.metadata.create_all(bind=engine)

# 获取数据库会话
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()