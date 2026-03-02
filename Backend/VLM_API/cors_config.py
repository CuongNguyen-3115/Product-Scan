# -*- coding: utf-8 -*-
import os
from flask_cors import CORS

def init_cors(app):
    """
    Cho phép gọi API từ các origin dev phổ biến.
    Expo Go chạy native nên không bị CORS, nhưng Expo Web / trình duyệt thì cần.
    Có thể chỉnh ALLOWED_ORIGINS trong .env, ví dụ:
    ALLOWED_ORIGINS=http://localhost:19006,http://192.168.1.10:19006
    """
    allowed = (os.getenv("ALLOWED_ORIGINS") or
               "http://localhost:8081,"
               "http://127.0.0.1:8081,"
               "http://localhost:19006,"
               "http://localhost:19000,"
               "http://localhost:5173,"
               "http://localhost:3000").split(",")

    # Dev đơn giản: nếu muốn mở hoàn toàn, dùng origins="*"
    # CORS(app, resources={r"/*": {"origins": "*"}})

    CORS(app, resources={
        r"/label/*": {"origins": allowed},
        r"/advice":  {"origins": allowed},
        r"/chat":    {"origins": allowed},
    })
