import httpx
from typing import Dict

class UploadService:
    TMPFILE_API = "https://tmpfile.link/api/upload"

    async def upload_to_tmpfile(self, file_content: bytes, filename: str) -> Dict:
        async with httpx.AsyncClient() as client:
            files = {"file": (filename, file_content)}
            response = await client.post(self.TMPFILE_API, files=files)
            response.raise_for_status()
            data = response.json()
            return {
                "url": data.get("downloadLink"),
                "meta": {
                    "filename": filename,
                    "size": len(file_content)
                }
            }

upload_service = UploadService()
