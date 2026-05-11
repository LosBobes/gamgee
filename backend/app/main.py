from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import Base, engine
from .routers import items, workouts, prs, auth, health

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Gamgee API", version="0.1.0", redirect_slashes=False)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(items.router, prefix="/api")
app.include_router(workouts.router, prefix="/api")
app.include_router(prs.router, prefix="/api")
app.include_router(health.router, prefix="/api")


@app.get("/health")
def health():
    return {"status": "ok"}
