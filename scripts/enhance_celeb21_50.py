import os
import urllib.request
import cv2
from cv2 import dnn_superres
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
# Use EDSR_x2 for better quality enhancement
MODEL_PATH = ROOT / "models" / "EDSR_x2.pb"
MODEL_URL = "https://github.com/Saafke/EDSR_Tensorflow/raw/master/models/EDSR_x2.pb"

def ensure_model():
    if not MODEL_PATH.exists():
        print(f"Downloading EDSR_x2 model to {MODEL_PATH}...")
        MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
        urllib.request.urlretrieve(MODEL_URL, str(MODEL_PATH))
        print("Download complete.")

def enhance_image(src_path, dst_path, sr):
    img = cv2.imread(str(src_path))
    if img is None:
        print(f"Failed to read {src_path}")
        return
    
    # Upscale with EDSR for better quality
    print(f"Enhancing {src_path.name} with EDSR...")
    upscaled = sr.upsample(img)
    
    # Apply additional sharpening
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    upscaled = cv2.filter2D(upscaled, -1, kernel)
    
    # Save with high quality
    cv2.imwrite(str(dst_path), upscaled, [int(cv2.IMWRITE_JPEG_QUALITY), 100])
    print(f"Enhanced {dst_path.name}")

def main():
    ensure_model()
    sr = dnn_superres.DnnSuperResImpl_create()
    sr.readModel(str(MODEL_PATH))
    sr.setModel("edsr", 2)
    
    images_dir = ROOT / "public" / "images_face"
    
    # Process celeb 21 to 50
    for i in range(21, 51):
        celeb_id = f"celeb{i:02d}"
        celeb_dir = images_dir / celeb_id
        if not celeb_dir.exists():
            print(f"Warning: {celeb_dir} does not exist.")
            continue
            
        files = sorted([f for f in celeb_dir.iterdir() if f.is_file() and not f.name.startswith('.')])
        count = 1
        for f in files:
            ext = f.suffix.lower()
            new_name = f"{count:02d}{ext}"
            target_path = celeb_dir / new_name
            
            # if we haven't renamed it yet
            if f.name != new_name:
                f.rename(target_path)
                f = target_path
            
            # enhance it
            enhance_image(f, target_path, sr)
            count += 1

if __name__ == "__main__":
    main()
