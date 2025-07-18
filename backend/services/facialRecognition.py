# pip install pillow numpy opencv-python torch torchvision facenet-pytorch
# pip install python-dotenv
# pip install supabase
from dotenv import load_dotenv
load_dotenv(dotenv_path="backend/.env.local")

import os
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from typing import List
import math
import httpx
import json
from torchvision import transforms
from PIL import Image
import numpy as np
import torch
import cv2
from facenet_pytorch import InceptionResnetV1
from supabase import create_client, Client

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError("Supabase environment variables not loaded. Check .env.local path.")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

router = APIRouter()
model = InceptionResnetV1(pretrained='vggface2').eval()
 
def cosine_similarity(a, b):
    a, b = np.array(a), np.array(b)
    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))

@router.post("/extract-embedding")
async def extract_embedding(
    file: UploadFile = File(...),
    user_id: str = Form(...)
):
    image_bytes = await file.read()
    np_arr = np.frombuffer(image_bytes, np.uint8)
    image = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

    pil_img = Image.fromarray(cv2.cvtColor(image, cv2.COLOR_BGR2RGB))
    preprocess = transforms.Compose([
        transforms.Resize((160, 160)),
        transforms.ToTensor(),
        transforms.Normalize([0.5, 0.5, 0.5], [0.5, 0.5, 0.5])
    ])
    img_tensor = preprocess(pil_img).unsqueeze(0)

    with torch.no_grad():
        embedding = model(img_tensor).squeeze().numpy()
    embedding_list = embedding.tolist()

    response = supabase.table("users").update({
        "face_embedding": embedding_list
    }).eq("id", user_id).execute()
    
    print("Supabase update response:", response)

    if not response or not response.data:
        raise HTTPException(status_code=500, detail=f"Failed to update embedding in Supabase. Response: {response}")

    return {"message": "Embedding updated successfully."}


@router.post("/compare-faces")
async def compare_faces(
    file: UploadFile = File(...),
    user_id: str = Form(...)
):
    # Read image from request
    image_bytes = await file.read()
    np_arr = np.frombuffer(image_bytes, np.uint8)
    image = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

    # Preprocess and extract live embedding
    pil_img = Image.fromarray(cv2.cvtColor(image, cv2.COLOR_BGR2RGB))
    preprocess = transforms.Compose([
        transforms.Resize((160, 160)),
        transforms.ToTensor(),
        transforms.Normalize([0.5, 0.5, 0.5], [0.5, 0.5, 0.5])
    ])
    img_tensor = preprocess(pil_img).unsqueeze(0)

    with torch.no_grad():
        live_embedding = model(img_tensor).squeeze().numpy().tolist()

    async with httpx.AsyncClient() as client:
        try:
            user_response = await client.get(f"http://localhost:5000/users/{user_id}")
            user_response.raise_for_status()
        except httpx.HTTPStatusError as e:
            raise HTTPException(status_code=e.response.status_code, detail="User not found")

        stored_embedding_raw = user_response.json().get("face_embedding")
        if stored_embedding_raw is None:
            raise HTTPException(status_code=404, detail="Stored face embedding not found")

        stored_embedding = json.loads(stored_embedding_raw)

        similarity = cosine_similarity(stored_embedding, live_embedding)
        match = bool(similarity > 0.6)  # Cast to native Python bool

        if match:
            await client.put(f"http://localhost:5000/users/{user_id}/verification", json={"verified": True})

    return {"match": match}
