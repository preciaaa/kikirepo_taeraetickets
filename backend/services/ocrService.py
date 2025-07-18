# pip install mistralai
import os
from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from uuid import uuid4
from mistralai import Mistral
import requests
from io import BytesIO

# Load .env.local explicitly
load_dotenv(dotenv_path="backend/.env.local")

# Load environment variables
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
MISTRAL_API_KEY = os.getenv("MISTRAL_API_KEY")

# Validate env vars
if not SUPABASE_URL or not SUPABASE_KEY or not MISTRAL_API_KEY:
    raise RuntimeError("Missing one or more required environment variables.")

# Initialize app and Mistral client
router = APIRouter()
client = Mistral(api_key=MISTRAL_API_KEY)

# Use the name of your actual public bucket
BUCKET_NAME = "tickets"

# Function to check if bucket exists and create it if needed
def ensure_bucket_exists():
    try:
        # Check if bucket exists
        bucket_url = f"{SUPABASE_URL}/storage/v1/buckets/{BUCKET_NAME}"
        response = requests.get(
            bucket_url,
            headers={"Authorization": f"Bearer {SUPABASE_KEY}"}
        )
        print(bucket_url)
        if response.status_code == 404:
            # Create bucket if it doesn't exist
            create_response = requests.post(
                f"{SUPABASE_URL}/storage/v1/buckets",
                headers={
                    "Authorization": f"Bearer {SUPABASE_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "id": BUCKET_NAME,
                    "name": BUCKET_NAME,
                    "public": True
                }
            )
            if create_response.status_code in [200, 201]:
                print(f"Created bucket: {BUCKET_NAME}")
            else:
                print(f"Failed to create bucket: {create_response.status_code} - {create_response.text}")
        elif response.status_code == 200:
            print(f"Bucket {BUCKET_NAME} already exists")
        else:
            print(f"Error checking bucket: {response.status_code} - {response.text}")
            
    except Exception as e:
        print(f"Error ensuring bucket exists: {e}")

# Ensure bucket exists on startup
ensure_bucket_exists()

@router.post("/extract-text/")
async def extract_text(file: UploadFile = File(...)):
    try:
        # 1. Validate PDF
        if not file.filename or not file.filename.endswith('.pdf'):
            raise HTTPException(status_code=400, detail="Only PDF files are supported.")

        file_bytes = await file.read()
        file_name = f"{uuid4()}.pdf"

        # 2. Upload to Supabase Storage
        upload_url = f"{SUPABASE_URL}/storage/v1/object/{BUCKET_NAME}/{file_name}"
        
        print(f"Uploading to: {upload_url}")
        print(f"Bucket: {BUCKET_NAME}")
        print(f"File size: {len(file_bytes)} bytes")
        
        response = requests.post(
            upload_url,
            headers={
                "Authorization": f"Bearer {SUPABASE_KEY}",
                "Content-Type": "application/pdf"
            },
            data=file_bytes
        )
        bucket_check_url = f"{SUPABASE_URL}/storage/v1/buckets/{BUCKET_NAME}"
        bucket_resp = requests.get(bucket_check_url, headers={"Authorization": f"Bearer {SUPABASE_KEY}"})
        print(f"Bucket check before upload: {bucket_resp.status_code} {bucket_resp.text}")


        print(f"Upload response status: {response.status_code}")
        print(f"Upload response: {response.text}")

        if response.status_code not in [200, 201]:
            error_detail = f"Failed to upload file to Supabase. Status: {response.status_code}, Response: {response.text}"
            raise HTTPException(status_code=500, detail=error_detail)

        # 3. Construct public URL manually
        public_url = f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET_NAME}/{file_name}"

        # 4. Send to Mistral OCR
        ocr_response = client.ocr.process(
        model="mistral-ocr-latest",
        document={
            "type": "document_url",
            "document_url": public_url 
        },
        include_image_base64=False
    )

        
        # Debug: Print OCR response structure
        print(f"OCR Response type: {type(ocr_response)}")
        print(f"OCR Response attributes: {dir(ocr_response)}")
        if hasattr(ocr_response, 'pages'):
            print(f"Number of pages: {len(ocr_response.pages)}")
            if ocr_response.pages:
                print(f"First page attributes: {dir(ocr_response.pages[0])}")

        # 5. Extract text from response
        # Based on debug output, OCR response has 'pages' with 'markdown' attribute
        if hasattr(ocr_response, 'pages') and ocr_response.pages:
            # Extract text from pages using markdown attribute
            page_texts = []
            image_names = []
            for page in ocr_response.pages:
                if hasattr(page, 'markdown') and page.markdown:
                    page_texts.append(page.markdown)
                # Collect image names from markdown
                if hasattr(page, 'markdown') and page.markdown:
                    import re
                    image_names += re.findall(r'!\[.*?\]\((img-\d+\.jpeg)\)', page.markdown)
            extracted_text = '\n'.join(page_texts) if page_texts else str(ocr_response)
        elif hasattr(ocr_response, 'text') and ocr_response.text:
            extracted_text = ocr_response.text
            image_names = []
        elif hasattr(ocr_response, 'content') and ocr_response.content:
            extracted_text = ocr_response.content
            image_names = []
        else:
            # Fallback to string representation
            extracted_text = str(ocr_response)
            image_names = []

        # Fallback: If event name is missing from extracted_text, try OCR on first image after last banner
        def event_name_missing(text):
            lines = text.split('\n')
            last_ticket_idx = -1
            for i, line in enumerate(lines):
                if 'THIS IS YOUR TICKET' in line:
                    last_ticket_idx = i
            if last_ticket_idx != -1:
                for i in range(last_ticket_idx + 1, len(lines)):
                    l = lines[i].strip()
                    if l and not l.startswith('!['):
                        # Found a candidate event name
                        return False
            return True

        if event_name_missing(extracted_text) and image_names:
            # Try OCR on the first image after the last banner
            img_name = image_names[0]
            # Download the image from Supabase storage
            img_url = f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET_NAME}/{img_name}"
            img_ocr_response = client.ocr.process(
                model="mistral-ocr-latest",
                document={
                    "type": "document_url",
                    "document_url": img_url
                },
                include_image_base64=False
            )
            # Extract text from image OCR
            img_text = None
            if hasattr(img_ocr_response, 'pages') and img_ocr_response.pages:
                for page in img_ocr_response.pages:
                    if hasattr(page, 'markdown') and page.markdown:
                        img_text = page.markdown.strip()
                        break
            elif getattr(img_ocr_response, 'text', None):
                img_text = img_ocr_response.text.strip()
            elif getattr(img_ocr_response, 'content', None):
                img_text = img_ocr_response.content.strip()
            # Append the image OCR result to the main text for the parser
            if img_text:
                extracted_text += f"\n{img_text}"

        return {
            "text": extracted_text,
            "is_scanned": getattr(ocr_response, 'is_scanned', False),
            "file_url": public_url
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OCR processing failed: {str(e)}")

@router.get('/health')
async def health_check():
    return {
        'status': 'healthy',
        'mistral_configured': bool(MISTRAL_API_KEY),
        'supabase_configured': bool(SUPABASE_URL and SUPABASE_KEY)
    }
