from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import database, models
from app.routers_ingestion import router as ingestion_router
from app.routers_users import router as users_router
from app.routers_strategies import router as strategies_router


# Create DB tables
models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="Collections Strategy Backend", version="0.1.0")

# CORS: allow all origins for prototype; tighten for production
# Note: Cannot use allow_origins=["*"] with allow_credentials=True
# So we either remove credentials or specify exact origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],  # Frontend origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Include routers
app.include_router(ingestion_router)
app.include_router(users_router)
app.include_router(strategies_router)


@app.get("/")
async def root():
    return {"message": "Collections strategy backend is running"}
