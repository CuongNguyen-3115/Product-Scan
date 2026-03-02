import google.generativeai as genai
import os
from dotenv import load_dotenv

# 1. Nạp API Key từ file .env
load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    print("Lỗi: Không tìm thấy GEMINI_API_KEY trong file .env")
else:
    genai.configure(api_key=api_key)
    
    print("--- CÁC MODEL BẠN CÓ THỂ SỬ DỤNG: ---")
    try:
        for m in genai.list_models():
            # Chỉ lọc ra các model hỗ trợ tạo nội dung (generateContent)
            if 'generateContent' in m.supported_generation_methods:
                print(f"Tên model: {m.name}")
    except Exception as e:
        print(f"Lỗi khi kiểm tra: {e}")