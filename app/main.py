from fastapi import FastAPI

from app.api.v1.routers.health import router as health_router
from app.api.v1.routers.users import router as users_router
from app.api.v1.routers.auth import router as auth_router
from app.db.session import engine
from app.db.base import Base

app = FastAPI(
    title="AI Capital Management MVP",
    version="0.1.0",
)

Base.metadata.create_all(bind=engine)

app.include_router(health_router)
app.include_router(auth_router, prefix="/api/v1")
app.include_router(users_router, prefix="/api/v1")
