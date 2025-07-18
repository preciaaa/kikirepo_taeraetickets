# pip install imagehash PyMuPDF
import os
from fastapi import APIRouter, HTTPException, UploadFile, File
from dotenv import load_dotenv
from fastapi.responses import JSONResponse
from PIL import Image
import imagehash
from supabase import create_client, Client
import fitz  # PyMuPDF

# Load environment variables
load_dotenv(dotenv_path="backend/.env.local")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError("Supabase environment variables not loaded. Check .env.local path.")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Define APIRouter for deduplication endpoints
router = APIRouter()

@router.post('/check-duplicate')
async def check_duplicate(file: UploadFile = File(...)):
    filename = getattr(file, 'filename', None)
    content_type = getattr(file, 'content_type', None)
    is_pdf = (filename and filename.endswith('.pdf')) or (content_type == 'application/pdf')
    try:
        if is_pdf:
            contents = await file.read()
            # Use fitz (PyMuPDF) to convert the first page of the PDF to a PIL Image
            pdf_doc = fitz.open(stream=contents, filetype="pdf")
            page = pdf_doc[0]
            # Try both get_pixmap and getPixmap for compatibility
            try:
                pix = page.get_pixmap()
            except AttributeError:
                pix = page.getPixmap()
            img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
        else:
            file.file.seek(0)
            img = Image.open(file.file)
        img = img.convert("L").resize((256, 256))
        phash = str(imagehash.phash(img))
        response = supabase.table("listings").select("phash").eq("phash", phash).execute()
        is_duplicate = len(response.data or []) > 0
        return {"is_duplicate": is_duplicate, "phash": phash}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Deduplication failed: {str(e)}")

@router.get('/health')
async def health_check():
    return {"status": "healthy", "supabase_configured": bool(SUPABASE_URL and SUPABASE_KEY)}