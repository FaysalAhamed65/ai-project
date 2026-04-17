import os
from pathlib import Path

import cv2
from PIL import Image, ImageEnhance, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
SRC_DIR = ROOT / "public" / "images"
DST_DIR = ROOT / "public" / "images_face"
MODEL_PATH = ROOT / "models" / "face_detection_yunet_2023mar.onnx"

# Output aspect ratio (width / height).
# Use a square crop to reduce frame height and show mostly face.
TARGET_ASPECT = 3 / 5
# Tighter head framing (hair -> throat, minimal shoulders/body).
# These are multipliers of detected face-box height/width.
FACE_WIDTH_PORTION = 0.88
TOP_EXTRA_FACE_HEIGHT = 0.75
BOTTOM_EXTRA_FACE_HEIGHT = 0.45

def ensure_dir(p: Path) -> None:
    p.mkdir(parents=True, exist_ok=True)


def enhance_image(img: Image.Image) -> Image.Image:
    """Apply basic enhancements: sharpening, contrast, and color."""
    # Sharpen the image using Unsharp Mask to make soft edges pop
    img = img.filter(ImageFilter.UnsharpMask(radius=2, percent=150, threshold=3))
    
    # Enhance contrast slightly to bring out details
    enhancer_contrast = ImageEnhance.Contrast(img)
    img = enhancer_contrast.enhance(1.1)
    
    # Enhance color (saturation) slightly
    enhancer_color = ImageEnhance.Color(img)
    img = enhancer_color.enhance(1.05)
    
    return img


def detect_main_face(detector, image_bgr):
    """Return (x, y, w, h) for the largest detected face in BGR image, or None."""
    h, w, _ = image_bgr.shape
    detector.setInputSize((w, h))
    _, results = detector.detect(image_bgr)
    if results is None or len(results) == 0:
        return None

    best = None
    best_area = 0
    for det in results:
        x, y, bw, bh = det[:4]
        x = int(x)
        y = int(y)
        bw = int(bw)
        bh = int(bh)
        area = bw * bh
        if area > best_area:
            best_area = area
            best = (x, y, bw, bh)
    return best


def shift_box_within_bounds(left, top, right, bottom, img_w, img_h):
    crop_w = right - left
    crop_h = bottom - top

    if left < 0:
        right -= left
        left = 0
    if right > img_w:
        left -= right - img_w
        right = img_w
    if top < 0:
        bottom -= top
        top = 0
    if bottom > img_h:
        top -= bottom - img_h
        bottom = img_h

    left = max(0, left)
    top = max(0, top)
    right = min(img_w, right)
    bottom = min(img_h, bottom)

    if right - left < crop_w:
        left = max(0, right - crop_w)
        right = min(img_w, left + crop_w)
    if bottom - top < crop_h:
        top = max(0, bottom - crop_h)
        bottom = min(img_h, top + crop_h)

    return int(left), int(top), int(right), int(bottom)


def expand_and_fit_aspect(x, y, bw, bh, img_w, img_h):
    """
    Build a portrait crop around the face with less body in frame.
    Returns integer (left, top, right, bottom) in image coordinates.
    """
    face_cx = x + bw / 2

    # Vertical framing: include hair/forehead, include a bit below chin (throat), avoid torso.
    top = y - (bh * TOP_EXTRA_FACE_HEIGHT)
    bottom = y + bh + (bh * BOTTOM_EXTRA_FACE_HEIGHT)
    crop_h = max(1.0, bottom - top)

    # Width derived from target aspect, but keep it tight around face to avoid shoulders.
    crop_w_from_aspect = crop_h * TARGET_ASPECT
    min_crop_w = bw / FACE_WIDTH_PORTION
    crop_w = max(min_crop_w, crop_w_from_aspect)

    # Hard cap width relative to detected face width (prevents wide shoulder crops).
    crop_w = min(crop_w, bw * 1.55)

    left = face_cx - crop_w / 2
    right = face_cx + crop_w / 2

    # Ensure the detected face box fully fits within crop.
    if left > x:
        shift = left - x
        left -= shift
        right -= shift
    if right < x + bw:
        shift = (x + bw) - right
        left += shift
        right += shift

    return shift_box_within_bounds(left, top, right, top + crop_h, img_w, img_h)


def center_crop_to_aspect(img: Image.Image, target_aspect: float) -> Image.Image:
    """Fallback if no face detected: center crop to given aspect ratio."""
    iw, ih = img.size
    current_aspect = iw / ih

    if current_aspect > target_aspect:
        # Too wide -> crop width
        new_w = int(ih * target_aspect)
        left = (iw - new_w) // 2
        box = (left, 0, left + new_w, ih)
    else:
        # Too tall -> crop height
        new_h = int(iw / target_aspect)
        top = (ih - new_h) // 2
        box = (0, top, iw, top + new_h)

    return img.crop(box)


def process_image(detector, src_path: Path, dst_path: Path) -> None:
    img_bgr = cv2.imread(str(src_path))
    if img_bgr is None:
        print(f"[WARN] Could not read image: {src_path}")
        return

    h, w, _ = img_bgr.shape
    face_box = detect_main_face(detector, img_bgr)

    pil_img = Image.open(src_path).convert("RGB")

    if face_box is None:
        print(f"[INFO] No face detected, using center crop: {src_path}")
        cropped = center_crop_to_aspect(pil_img, TARGET_ASPECT)
    else:
        x, y, bw, bh = face_box
        left, top, right, bottom = expand_and_fit_aspect(x, y, bw, bh, w, h)
        cropped = pil_img.crop((left, top, right, bottom))

    # --- Apply Image Enhancement ---
    cropped = enhance_image(cropped)

    ensure_dir(dst_path.parent)
    # Save as high-quality JPEG with enhancement
    cropped.save(dst_path, format="JPEG", quality=95, subsampling=0)
    print(f"[OK] Cropped and Enhanced -> {dst_path.relative_to(ROOT)}")


def main() -> None:
    if not SRC_DIR.exists():
        raise SystemExit(f"Source directory does not exist: {SRC_DIR}")
    if not MODEL_PATH.exists():
        raise SystemExit(f"Missing face detector model: {MODEL_PATH}")

    detector = cv2.FaceDetectorYN_create(
        str(MODEL_PATH),
        "",
        (320, 320),
        score_threshold=0.75,
        nms_threshold=0.3,
        top_k=10,
    )

    MANUAL_OVERRIDES = {
        "celeb01/04.jpg", "celeb01/05.jpg",
        "celeb02/04.jpg",
        "celeb03/03.jpg", "celeb03/04.jpg",
        "celeb05/02.jpg", "celeb05/04.jpg",
        "celeb06/02.jpg",
        "celeb07/02.jpg",
        "celeb08/02.jpg",
        "celeb10/05.jpg",
        "celeb11/03.jpg", "celeb11/04.jpg",
        "celeb12/01.jpg",
        "celeb13/03.jpg", "celeb13/04.jpg", "celeb13/05.jpg",
        "celeb15/03.jpg", "celeb15/04.jpg",
        "celeb16/02.jpg",
        "celeb17/04.jpg", "celeb17/05.jpg",
        "celeb18/03.jpg", "celeb18/05.jpg",
        "celeb19/02.jpg", "celeb19/03.jpg", "celeb19/04.jpg"
    }

    for celeb_dir in sorted(SRC_DIR.iterdir()):
        if not celeb_dir.is_dir():
            continue
        for img_file in sorted(celeb_dir.iterdir()):
            if img_file.suffix.lower() not in {".jpg", ".jpeg", ".png", ".webp"}:
                continue
            rel = img_file.relative_to(SRC_DIR)
            # Always write as .jpg for consistency.
            dst = DST_DIR / rel.with_suffix(".jpg")
            
            # Check if this specific photo was manually edited
            rel_str = rel.with_suffix(".jpg").as_posix()
            if rel_str in MANUAL_OVERRIDES:
                print(f"[SKIP] Explicitly skipping custom photo: {rel_str}")
                continue
                
            process_image(detector, img_file, dst)


if __name__ == "__main__":
    main()

