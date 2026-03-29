import os
import re
import uuid
import time
import io
from flask import Flask, request, jsonify
from werkzeug.utils import secure_filename
import cv2
import numpy as np
from PIL import Image
import easyocr

# Initialize Flask app
app = Flask(__name__)

# Configuration
app.config['MAX_CONTENT_LENGTH'] = 10 * 1024 * 1024  # 10MB
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['ALLOWED_EXTENSIONS'] = {'png', 'jpg', 'jpeg', 'pdf'}

# Create upload folder
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Initialize EasyOCR globally
print("Loading EasyOCR (this may take a moment on first run)...")
reader = easyocr.Reader(['en'], gpu=False, verbose=False)
print("EasyOCR loaded successfully!")


def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower(
           ) in app.config['ALLOWED_EXTENSIONS']


def preprocess_image(img_path):
    """Preprocess image for better OCR"""
    img = cv2.imread(img_path)
    if img is None:
        raise ValueError(f"Could not read image: {img_path}")

    # Resize if image is small
    height, width = img.shape[:2]
    if width < 1000 or height < 1000:
        img = cv2.resize(img, None, fx=1.5, fy=1.5,
                         interpolation=cv2.INTER_CUBIC)

    # Convert to grayscale
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # Apply adaptive threshold
    thresh = cv2.adaptiveThreshold(
        gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
    )

    # Denoise
    denoised = cv2.medianBlur(thresh, 3)

    # Convert back to 3-channel for consistency
    return cv2.cvtColor(denoised, cv2.COLOR_GRAY2BGR)


def pdf_to_images(pdf_path):
    """Convert PDF to list of images"""
    try:
        import fitz
        images = []
        pdf_document = fitz.open(pdf_path)

        for page_num in range(len(pdf_document)):
            page = pdf_document.load_page(page_num)
            pix = page.get_pixmap(matrix=fitz.Matrix(2.0, 2.0))
            img_data = pix.tobytes("png")
            img = Image.open(io.BytesIO(img_data))
            images.append(img)

        pdf_document.close()
        return images
    except ImportError:
        raise Exception(
            "PyMuPDF not installed. Install with: pip install PyMuPDF")


def group_lines(words):
    """Group OCR words into lines based on Y-coordinate"""
    if not words:
        return []

    words = sorted(words, key=lambda x: x["box"][0][1])

    lines = []
    current = []
    prev_y = None

    for w in words:
        y = w["box"][0][1]

        if prev_y is None or abs(y - prev_y) < 15:
            current.append(w["text"])
        else:
            if current:
                lines.append(" ".join(current))
            current = [w["text"]]

        prev_y = y

    if current:
        lines.append(" ".join(current))

    return lines


def run_ocr(img):
    """Run OCR using EasyOCR"""
    try:
        # Convert BGR to RGB for EasyOCR
        img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        result = reader.readtext(img_rgb, detail=1, paragraph=False)

        words = []
        for detection in result:
            box, text, confidence = detection
            words.append({
                "text": text,
                "box": box,
                "confidence": confidence
            })

        return words
    except Exception as e:
        raise Exception(f"OCR processing failed: {str(e)}")


def extract_vendor(lines):
    """Extract vendor name from receipt"""
    if not lines:
        return None

    # Keywords to skip
    skip_patterns = ['receipt', 'invoice', 'tax', 'total', 'date', 'time',
                     'phone', 'email', 'www', 'http', 'thank', 'visit',
                     'subtotal', 'balance', 'change', 'cash', 'card']

    for line in lines:
        line_clean = line.strip()
        # Look for potential vendor name (usually at top, not too long, not containing numbers)
        if (line_clean and 3 < len(line_clean) < 50 and
            not any(p in line_clean.lower() for p in skip_patterns) and
            not re.search(r'\d', line_clean[:3]) and
                not re.search(r'[$€£]', line_clean)):
            return line_clean

    # Fallback to first non-empty line
    for line in lines:
        if line.strip():
            return line.strip()

    return None


def extract_date(lines):
    """Extract date from receipt"""
    date_patterns = [
        r'\d{2}[/-]\d{2}[/-]\d{2,4}',  # DD/MM/YYYY or MM/DD/YYYY
        # DD Month YYYY
        r'\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{2,4}',
        # Month DD, YYYY
        r'(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},\s+\d{4}',
        r'\d{4}[/-]\d{2}[/-]\d{2}',  # YYYY/MM/DD
    ]

    for line in lines:
        for pattern in date_patterns:
            match = re.search(pattern, line, re.IGNORECASE)
            if match:
                return match.group()
    return None


def extract_amount(lines, keywords):
    """Extract amount based on keywords"""
    candidates = []
    for line in lines:
        if any(kw in line.lower() for kw in keywords):
            # Find all decimal numbers
            nums = re.findall(r'\d+\.\d{2}', line)
            if nums:
                try:
                    candidates.append(float(nums[-1]))
                except:
                    pass

    # Also look for numbers with $ sign
    for line in lines:
        if any(kw in line.lower() for kw in keywords):
            nums = re.findall(r'\$\s*\d+\.\d{2}', line)
            if nums:
                try:
                    amount = float(re.search(r'\d+\.\d{2}', nums[-1]).group())
                    candidates.append(amount)
                except:
                    pass

    return max(candidates) if candidates else None


def extract_totals(lines):
    """Extract subtotal, tax, and total amounts"""
    total = extract_amount(
        lines, ["total", "amount", "balance", "paid", "grand total", "due"])
    subtotal = extract_amount(lines, ["subtotal", "sub", "net", "sub-total"])
    tax = extract_amount(
        lines, ["tax", "vat", "gst", "cgst", "sgst", "service tax"])

    return subtotal, tax, total


def extract_expense_lines(lines):
    """Extract individual line items from receipt"""
    expense_lines = {}
    exclude_keywords = ["total", "tax", "vat", "gst", "subtotal", "sub-total",
                        "change", "cash", "card", "visa", "mastercard", "paid",
                        "%", "discount", "tip", "service charge", "balance", "due"]

    for line in lines:
        line_lower = line.lower()

        # Skip lines with exclude keywords
        if any(kw in line_lower for kw in exclude_keywords):
            continue

        # Find prices in the line
        prices = re.findall(r'\d+\.\d{2}', line)
        if prices:
            price_str = prices[-1]
            try:
                price = float(price_str)
                # Only consider reasonable prices
                if 0.01 <= price <= 10000:
                    # Extract item name by removing the price
                    item_name = line.replace(
                        price_str, '').replace('$', '').strip()
                    # Clean up item name
                    item_name = re.sub(
                        r'^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$', '', item_name)
                    item_name = re.sub(r'\s+', ' ', item_name).strip()

                    # Filter valid items
                    if (len(item_name) > 2 and len(item_name) < 100 and
                        not item_name.replace('.', '').isdigit() and
                        item_name.lower() not in exclude_keywords and
                            not re.search(r'\d{2}[/-]\d{2}', item_name)):
                        expense_lines[item_name] = price
            except:
                continue

    return expense_lines


def extract_expense_type(vendor, expense_lines):
    """Determine expense category based on vendor and items"""
    text = (vendor or "").lower() + " " + \
        " ".join(expense_lines.keys()).lower()

    categories = {
        "hotel": ["hotel", "motel", "inn", "resort", "suites", "lodge", "accommodation", "stay"],
        "travel": ["uber", "lyft", "taxi", "flight", "airline", "train", "rail", "bus", "transport", "cab", "ola"],
        "food": ["food", "restaurant", "cafe", "burger", "coffee", "pizza", "pub", "bar", "grill", "eats", "dining", "kitchen", "meal"],
        "groceries": ["grocery", "supermarket", "walgreens", "cvs", "walmart", "target", "costco", "market", "food mart"],
        "shopping": ["store", "shop", "mall", "retail", "boutique", "outlet"],
        "utilities": ["electric", "water", "gas", "internet", "phone", "utility"]
    }

    for category, keywords in categories.items():
        if any(kw in text for kw in keywords):
            return category

    return "others"


def extract_description(vendor, expense_type):
    """Generate description for the expense"""
    if vendor:
        return f"{expense_type.capitalize()} expense at {vendor}"
    return f"{expense_type.capitalize()} expense"


def process_file(file_path):
    """Process image or PDF file and extract receipt data"""
    all_lines = []

    try:
        # Check if PDF
        if file_path.lower().endswith('.pdf'):
            images = pdf_to_images(file_path)

            for idx, img in enumerate(images):
                temp_path = os.path.join(
                    app.config['UPLOAD_FOLDER'], f"temp_{uuid.uuid4().hex}.png")
                try:
                    img.save(temp_path)
                    processed = preprocess_image(temp_path)
                    words = run_ocr(processed)
                    lines = group_lines(words)
                    all_lines.extend(lines)
                finally:
                    if os.path.exists(temp_path):
                        os.remove(temp_path)
        else:
            # Process image
            processed = preprocess_image(file_path)
            words = run_ocr(processed)
            all_lines = group_lines(words)

        # Debug: Print extracted lines
        # First 10 lines
        app.logger.debug(f"Extracted lines: {all_lines[:10]}")

        # Extract data
        vendor = extract_vendor(all_lines)
        date = extract_date(all_lines)
        subtotal, tax, total = extract_totals(all_lines)
        expense_lines = extract_expense_lines(all_lines)
        expense_type = extract_expense_type(vendor, expense_lines)
        description = extract_description(vendor, expense_type)

        # Format currency
        def fmt(val):
            return f"${val:.2f}" if val else None

        return {
            "name_of_restaurant": vendor,
            "date": date,
            "subtotal": fmt(subtotal),
            "tax": fmt(tax),
            "amount": fmt(total),
            "expense_lines": {k: fmt(v) for k, v in expense_lines.items()},
            "expense_type": expense_type,
            "description": description
        }
    except Exception as e:
        raise Exception(f"Processing failed: {str(e)}")


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "version": "1.0.0",
        "ocr_engine": "EasyOCR",
        "ocr_available": reader is not None
    })


@app.route('/extract', methods=['POST'])
def extract():
    """Extract receipt data from uploaded file"""
    start_time = time.time()
    file_path = None

    try:
        # Check if file is present
        if 'file' not in request.files:
            return jsonify({"error": "No file provided"}), 400

        file = request.files['file']

        if file.filename == '':
            return jsonify({"error": "No file selected"}), 400

        if not allowed_file(file.filename):
            return jsonify({"error": "File type not allowed. Use PNG, JPG, JPEG, or PDF"}), 400

        # Save file
        filename = secure_filename(file.filename)
        unique_filename = f"{uuid.uuid4().hex}_{filename}"
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
        file.save(file_path)

        app.logger.info(f"Processing file: {filename}")

        # Process file
        result = process_file(file_path)

        processing_time = time.time() - start_time

        return jsonify({
            "success": True,
            "data": result,
            "filename": filename,
            "processing_time": f"{processing_time:.2f} seconds"
        })

    except Exception as e:
        app.logger.error(f"Error processing file: {str(e)}")
        import traceback
        app.logger.error(traceback.format_exc())

        return jsonify({
            "success": False,
            "error": str(e),
            "filename": file.filename if 'file' in request.files else "unknown"
        }), 500

    finally:
        # Clean up file
        if file_path and os.path.exists(file_path):
            try:
                os.remove(file_path)
            except:
                pass


@app.route('/extract/batch', methods=['POST'])
def extract_batch():
    """Extract data from multiple files"""
    if 'files' not in request.files:
        return jsonify({"error": "No files provided"}), 400

    files = request.files.getlist('files')
    results = []

    for file in files:
        if file and allowed_file(file.filename):
            file_path = None
            try:
                filename = secure_filename(file.filename)
                unique_filename = f"{uuid.uuid4().hex}_{filename}"
                file_path = os.path.join(
                    app.config['UPLOAD_FOLDER'], unique_filename)
                file.save(file_path)

                result = process_file(file_path)

                results.append({
                    "success": True,
                    "data": result,
                    "filename": filename
                })
            except Exception as e:
                results.append({
                    "success": False,
                    "error": str(e),
                    "filename": file.filename
                })
            finally:
                if file_path and os.path.exists(file_path):
                    try:
                        os.remove(file_path)
                    except:
                        pass
        else:
            results.append({
                "success": False,
                "error": "Invalid file type",
                "filename": file.filename if file else "unknown"
            })

    return jsonify(results)


@app.route('/debug/lines', methods=['POST'])
def debug_lines():
    """Debug endpoint to see extracted lines without processing"""
    file_path = None

    try:
        if 'file' not in request.files:
            return jsonify({"error": "No file provided"}), 400

        file = request.files['file']

        if file.filename == '':
            return jsonify({"error": "No file selected"}), 400

        filename = secure_filename(file.filename)
        unique_filename = f"{uuid.uuid4().hex}_{filename}"
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
        file.save(file_path)

        # Process just to get lines
        if file_path.lower().endswith('.pdf'):
            images = pdf_to_images(file_path)
            all_lines = []
            for img in images:
                temp_path = os.path.join(
                    app.config['UPLOAD_FOLDER'], f"temp_{uuid.uuid4().hex}.png")
                try:
                    img.save(temp_path)
                    processed = preprocess_image(temp_path)
                    words = run_ocr(processed)
                    lines = group_lines(words)
                    all_lines.extend(lines)
                finally:
                    if os.path.exists(temp_path):
                        os.remove(temp_path)
        else:
            processed = preprocess_image(file_path)
            words = run_ocr(processed)
            all_lines = group_lines(words)

        return jsonify({
            "success": True,
            "lines": all_lines,
            "line_count": len(all_lines)
        })

    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500
    finally:
        if file_path and os.path.exists(file_path):
            os.remove(file_path)


if __name__ == '__main__':
    print("=" * 60)
    print("OCR Backend Server with EasyOCR")
    print("=" * 60)
    print(f"Upload folder: {app.config['UPLOAD_FOLDER']}")
    print(f"OCR Engine: EasyOCR (English)")
    print(f"Server running on: http://localhost:8000")
    print("=" * 60)
    print("\nEndpoints:")
    print("  POST /extract - Extract receipt data")
    print("  POST /extract/batch - Batch extraction")
    print("  POST /debug/lines - Debug OCR lines")
    print("  GET  /health - Health check")
    print("=" * 60)

    app.run(host='0.0.0.0', port=8000, debug=False)
