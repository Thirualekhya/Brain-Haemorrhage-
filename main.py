import time
import random
from fastapi import FastAPI, File, UploadFile
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
import os

app = FastAPI()

# Mount the static directory
os.makedirs("static", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.post("/api/analyze")
async def analyze_image(file: UploadFile = File(...)):
    # Read the file to ensure it's received (not actually processing for the demo)
    content = await file.read()
    
    # Simulate ML model inference latency
    time.sleep(2)
    
    # Simulate Brain Hemorrhage Detection and Volume measurement
    # As requested: "between 0.1ml to 20ml"
    volume = round(random.uniform(0.1, 20.0), 2)
    
    # Randomize detection (favor true for demo purposes, 80% chance)
    is_hemorrhage = random.random() < 0.8
    
    if is_hemorrhage:
        # Simulate heatmap bounding box (relative to image width/height)
        # e.g., center x, center y, width, height relative to 1.0
        x_rel = round(random.uniform(0.3, 0.7), 2)
        y_rel = round(random.uniform(0.3, 0.7), 2)
        w_rel = round(random.uniform(0.1, 0.3), 2)
        h_rel = round(random.uniform(0.1, 0.3), 2)
        
        confidence = round(random.uniform(85.0, 99.9), 1)
        
        return JSONResponse({
            "detected": True,
            "volume_ml": volume,
            "confidence": confidence,
            "heatmap": {
                "x": x_rel,
                "y": y_rel,
                "w": w_rel,
                "h": h_rel
            },
            "message": f"Hemorrhage detected (Volume: {volume} ml)."
        })
    else:
        return JSONResponse({
            "detected": False,
            "volume_ml": 0.0,
            "confidence": round(random.uniform(95.0, 99.9), 1),
            "heatmap": None,
            "message": "No hemorrhage detected. Brain tissue appears normal."
        })

# Serve index at root
from fastapi.responses import FileResponse
@app.get("/")
async def get_root():
    return FileResponse("static/index.html")
