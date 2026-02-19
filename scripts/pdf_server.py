"""
MindCoder PDF Server — accepts JSON data, returns PDF.
Run: python3 scripts/pdf_server.py
Endpoint: POST http://localhost:8787/api/pdf
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel
from typing import Any
import uvicorn

from pdf_generator import generate_pdf

app = FastAPI(title="MindCoder PDF Service")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

class PDFRequest(BaseModel):
    data: dict[str, Any]

@app.post("/api/pdf")
async def create_pdf(req: PDFRequest):
    pdf_bytes = generate_pdf(req.data)
    return Response(content=pdf_bytes, media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=mindcoder_report.pdf"})

@app.get("/health")
async def health():
    return {"status": "ok"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8787)
