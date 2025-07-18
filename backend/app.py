# To run python backend services
# uvicorn app:app --reload --port 5002
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .services import facialRecognition
from .services import webScrapingService
from .services import ocrService
from .services import imageDedupService



app = FastAPI()

origins = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes from service modules
app.include_router(facialRecognition.router)
app.include_router(webScrapingService.router)
app.include_router(ocrService.router)
app.include_router(imageDedupService.router)