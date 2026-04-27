from fastapi import FastAPI
from routes import route
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Course API")

app.include_router(route)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5500"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(route)