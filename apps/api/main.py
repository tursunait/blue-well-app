from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import chat, calorie, myrec, calendar
import os

app = FastAPI(title="Halo API", version="0.1.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(chat.router, prefix="/chat", tags=["chat"])
app.include_router(calorie.router, prefix="/calorie", tags=["calorie"])
app.include_router(myrec.router, prefix="/myrec", tags=["myrec"])
app.include_router(calendar.router, prefix="/calendar", tags=["calendar"])


@app.get("/")
async def root():
    return {"message": "Halo API", "version": "0.1.0"}


@app.get("/health")
async def health():
    return {"status": "ok"}

