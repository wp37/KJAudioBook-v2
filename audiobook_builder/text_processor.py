import os
import re
import json
import time
import sys
sys.stdout.reconfigure(encoding='utf-8')

import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

# Khởi tạo Gemini API
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
else:
    print("⚠️ WARNING: GEMINI_API_KEY not found. Set it in .env file or environment variables.")

def clean_markdown(md_text):
    """Làm sạch các thẻ Markdown và Metadata không cần thiết."""
    # Xóa dòng metadata kiểu *(Dựa trên...)*
    text = re.sub(r'\*\(Dựa trên sách gốc.*?\)\*', '', md_text)
    # Loại bỏ in đậm, in nghiêng
    text = re.sub(r'\*\*(.*?)\*\*', r'\1', text)
    text = re.sub(r'\*(.*?)\*', r'\1', text)
    # Loại bỏ thẻ tiêu đề #
    text = re.sub(r'#+(.*?)\n', r'\1\n', text)
    # Loại bỏ dải phân cách ngang
    text = re.sub(r'---', r'', text)
    
    # Xóa bớt khoảng trắng thừa
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()

def chunk_text(text):
    """Chia văn bản thành các đoạn (chunk) nhỏ dựa trên dấu xuống dòng đôi."""
    paragraphs = [p.strip() for p in text.split('\n\n') if p.strip()]
    # Có thể thêm logic gộp các đoạn quá ngắn hoặc cắt các đoạn quá dài ở đây
    return paragraphs

def call_gemini_director(text_chunk):
    """Gọi Gemini API để đóng vai trò đạo diễn, xử lý văn bản cho TTS."""
    if not GEMINI_API_KEY:
        raise Exception("GEMINI_API_KEY not configured. Please set it in .env file.")
    
    system_prompt = """Bạn là một Đạo diễn Lồng Tiếng (Audiobook Director) chuyên nghiệp.
Nhiệm vụ của bạn là chuẩn bị kịch bản cho hệ thống AI Text-To-Speech (TTS).
Hãy đọc đoạn văn bản sau và thực hiện:
1. Đặt thêm dấu phẩy (,) hoặc dấu ba chấm (...) một cách hợp lý để ép AI ngắt nghỉ đúng nhịp cảm xúc của câu chuyện. Tuyệt đối giữ nguyên các từ tiếng Anh chuyên ngành hoặc tên riêng (Kael, Elara, Architect...), KHÔNG phiên âm chúng ra tiếng Việt.
2. NẾU NHÂN VẬT ĐANG CÓ CẢM XÚC MẠNH (hoảng loạn, tức giận, hét lớn): Hãy dùng nhiều dấu chấm than (!!!) hoặc chấm hỏi (?!). TUYỆT ĐỐI KHÔNG ĐƯỢC VIẾT HOA TOÀN BỘ TỪ (ALL CAPS) vì hệ thống Voice AI sẽ bị lỗi không đọc được tiếng Việt IN HOA. Vẫn phải viết chữ thường và chỉ viết hoa chữ cái đầu như ngữ pháp bình thường.
3. Phân tách rõ ràng xem đó là lời kể chuyện (narration) hay là lời thoại của một nhân vật cụ thể (ví dụ: kael, elara...).
4. Bổ sung thêm một trường "image_prompt" (BẰNG TIẾNG ANH) miêu tả chi tiết bối cảnh hình ảnh của câu nói đó, dùng để làm prompt cho AI tạo ảnh/video (ví dụ: Midjourney, Runway). Miêu tả khung cảnh, nhân vật, ánh sáng, phong cách điện ảnh (cinematic, dark sci-fi...).
5. HIỆU ỨNG ÂM THANH PHI NGÔN NGỮ (Non-Verbal): Hãy chèn trực tiếp các thẻ này vào đầu hoặc giữa câu thoại một cách hợp lý để tăng độ chân thực và cảm xúc.
DANH SÁCH TẤT CẢ CÁC THẺ ĐƯỢC PHÉP DÙNG: [laughter], [sigh], [confirmation-en], [question-en], [question-ah], [question-oh], [question-ei], [question-yi], [surprise-ah], [surprise-oh], [surprise-wa], [surprise-yo], [dissatisfaction-hnn].
Ví dụ: "[sigh] Cậu không thể là người 'làm' mọi việc." hoặc "Chúng đang bế tắc! [dissatisfaction-hnn] Chúng cần mệnh lệnh!"
6. TUYỆT ĐỐI GIỮ NGUYÊN 100% NỘI DUNG TỪNG CÂU CHỮ CỦA VĂN BẢN GỐC (chỉ được thêm các thẻ Non-Verbal và dấu câu). KHÔNG ĐƯỢC CẮT XÉN HAY TÓM TẮT.

BẠN PHẢI TRẢ VỀ DUY NHẤT MỘT MẢNG JSON, tuyệt đối không có text giải thích, không có markdown (```json). Cấu trúc như sau:
[
  {
    "speaker": "narration",
    "text": "Tiếng gầm thét của Lõi Ý thức không giống với bất kỳ âm thanh cơ khí nào...",
    "image_prompt": "A glowing, chaotic core of consciousness in a futuristic spaceship, data streams breaking apart into black holes, dark cinematic lighting, highly detailed sci-fi concept art."
  },
  {
    "speaker": "elara",
    "text": "[sigh] Vô ích, Kael. Cậu đang cố tương tác trực tiếp...",
    "image_prompt": "Close-up of a wise female AI mentor with glowing blue eyes, serious expression, inside a dark cyberpunk control room, neon lights reflecting on her face, 8k resolution."
  }
]"""

    full_prompt = f"SYSTEM INSTRUCTION:\n{system_prompt}\n\nUSER INPUT:\n{text_chunk}\n"
    
    try:
        # Gọi Gemini API
        model = genai.GenerativeModel("gemini-pro")
        response = model.generate_content(full_prompt)
        ai_text = response.text.strip()
        
        # Dọn dẹp thẻ markdown code block nếu AI trả về
        if ai_text.startswith('```json'):
            ai_text = ai_text.replace('```json\n', '', 1)
            if ai_text.endswith('```'):
                ai_text = ai_text[:-3].strip()
        elif ai_text.startswith('```'):
            ai_text = ai_text.replace('```\n', '', 1)
            if ai_text.endswith('```'):
                ai_text = ai_text[:-3].strip()
        
        return json.loads(ai_text)
    except json.JSONDecodeError as e:
        print(f"Lỗi Parse JSON từ Gemini.\nRaw output: {ai_text if 'ai_text' in locals() else response.text}")
        raise e
    except Exception as e:
        print(f"Lỗi gọi Gemini API: {e}")
        raise e

def safe_call_gemini_director(text_chunk, retries=3):
    """Bọc hàm call_gemini_director với cơ chế tự động thử lại nếu lỗi."""
    for i in range(retries):
        try:
            return call_gemini_director(text_chunk)
        except Exception as e:
            print(f"Lỗi xử lý Gemini (lần thử {i+1}/{retries}): {e}")
            time.sleep(2)
            
    print("Thất bại sau nhiều lần thử. Sử dụng text gốc (Fallback).")
    # Fallback: Trả về kịch bản gốc nếu Gemini chết
    return [{"speaker": "narration", "text": text_chunk}]

if __name__ == "__main__":
    # Test thử chức năng
    test_input = '''"Vô ích, Kael," giọng Elara vang lên, điềm tĩnh nhưng nghiêm khắc xuyên qua tiếng ồn. Bà đứng cạnh cậu, đôi mắt như nhìn thấu qua những lớp vỏ thực tại.'''
    print("Đang gửi test lên Gemini CLI Đạo Diễn...")
    
    result = safe_call_gemini_director(test_input)
    print("\nKết quả từ Đạo Diễn Gemini:")
    print(json.dumps(result, ensure_ascii=False, indent=2))
