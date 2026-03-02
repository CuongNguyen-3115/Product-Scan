#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
client_upload.py
- Mở hộp thoại chọn ảnh (luôn nổi trên cùng) và POST lên backend /label/analyze
- Sau khi server trả kết quả, hỏi "Có muốn up ảnh tiếp không? (Y/N)"
- Nếu Y thì tiếp tục mở hộp thoại; nếu N thì dừng.
Usage:
    python client_upload.py --backend http://localhost:8888/label/analyze
    # hoặc đặt biến môi trường BACKEND_URL
"""
import os
import io
import json
import argparse
import requests

# Tkinter cho hộp thoại file (có sẵn trong Python trên Windows)
import tkinter as tk
from tkinter import filedialog

def pick_image(initialdir=None):
    """Hiển thị hộp thoại chọn ảnh luôn ở trên cùng (không bị ẩn)."""
    root = tk.Tk()
    root.withdraw()                          # Ẩn cửa sổ chính
    try:
        # Đảm bảo dialog bật lên phía trước
        root.lift()
        root.attributes("-topmost", True)
        root.update()
    except Exception:
        pass

    filetypes = [
        ("Image files", "*.png;*.jpg;*.jpeg;*.bmp;*.webp;*.tif;*.tiff"),
        ("All files", "*.*"),
    ]
    if not initialdir:
        initialdir = os.path.expanduser("~")

    path = filedialog.askopenfilename(
        parent=root,
        title="Chọn ảnh nhãn sản phẩm",
        initialdir=initialdir,
        filetypes=filetypes,
    )
    try:
        # Bỏ trạng thái luôn-on-top để không làm phiền các cửa sổ khác
        root.attributes("-topmost", False)
    except Exception:
        pass
    root.destroy()
    return path

def post_image(endpoint, path, timeout=120):
    """POST ảnh đến endpoint /label/analyze. Trả về JSON (nếu có)."""
    with open(path, "rb") as f:
        files = {"image": (os.path.basename(path), f, "application/octet-stream")}
        r = requests.post(endpoint, files=files, timeout=timeout)

    # Cố gắng parse JSON nếu server trả JSON
    ctype = (r.headers.get("content-type") or "").lower()
    if "application/json" in ctype:
        return r.json()
    # Nếu không, trả text thô
    return {"raw": r.text, "status": r.status_code}

def main():
    parser = argparse.ArgumentParser(description="Upload ảnh nhãn để trích xuất Ingredients + Nutrition Facts")
    parser.add_argument(
        "--backend",
        default=os.environ.get("BACKEND_URL", "http://localhost:8888/label/analyze"),
        help="Endpoint backend /label/analyze"
    )
    args = parser.parse_args()

    endpoint = args.backend
    print(f"[client_upload] Backend: {endpoint}")

    last_dir = None
    while True:
        path = pick_image(initialdir=last_dir)
        if not path:
            ans = input("Bạn chưa chọn ảnh. Chọn lại? (Y/N): ").strip().lower()
            if ans == "y":
                continue
            else:
                print("Kết thúc.")
                break

        last_dir = os.path.dirname(path)
        print(f"Đang upload: {path}")

        try:
            resp = post_image(endpoint, path)
            print("Phản hồi từ server:")
            print(json.dumps(resp, ensure_ascii=False, indent=2))
        except requests.exceptions.RequestException as e:
            print(f"Lỗi mạng: {e}")

        ans = input("Có muốn up ảnh tiếp không? (Y/N): ").strip().lower()
        if ans != "y":
            print("Kết thúc.")
            break

if __name__ == "__main__":
    main()
