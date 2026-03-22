# ─── Добавить в app/main.py ───────────────────────────────────────────────────
# После существующих импортов роутеров:

from app.api.v1.routers.zakat_router import router as zakat_router
from app.api.v1.routers.shariah_screening_router import router as screening_router
from app.api.v1.routers.glossary_router import router as glossary_router
from app.api.v1.routers.islamic_profile_router import router as islamic_profile_router
from app.api.v1.routers.islamic_reference_router import router as islamic_reference_router

app.include_router(zakat_router,            prefix="/api/v1/islamic/zakat",      tags=["Islamic: Zakat"])
app.include_router(screening_router,        prefix="/api/v1/islamic/screening",  tags=["Islamic: Screening"])
app.include_router(glossary_router,         prefix="/api/v1/islamic/glossary",   tags=["Islamic: Glossary"])
app.include_router(islamic_profile_router,  prefix="/api/v1/islamic/profile",    tags=["Islamic: Profile"])
app.include_router(islamic_reference_router,prefix="/api/v1/islamic/references", tags=["Islamic: References"])
