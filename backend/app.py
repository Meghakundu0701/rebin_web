from flask import Flask, request, jsonify
from flask_cors import CORS
from ultralytics import YOLO
from PIL import Image
import io

app = Flask(__name__)
CORS(app)  # allows your warehouse website to call this API

# Load model once at startup
model = YOLO("best.pt")  # path to your trained model file

CLASS_META = {
    "plastic":   {"emoji": "🧴", "tags": ["Recyclable", "Bin 3", "Dry waste"],    "description": "Rinse and place in the plastic recycling bin."},
    "paper":     {"emoji": "📄", "tags": ["Recyclable", "Bin 1", "Dry waste"],    "description": "Flatten and place in the paper recycling bin."},
    "metal":     {"emoji": "🥫", "tags": ["Recyclable", "Bin 2", "Scrap"],        "description": "Clean metal. Place in scrap metal collection."},
    "ewaste":    {"emoji": "💻", "tags": ["Hazardous", "E-Waste", "Special"],     "description": "Do not bin. Send to certified e-waste facility."},
    "cardboard": {"emoji": "📦", "tags": ["Recyclable", "Bin 1", "Dry waste"],    "description": "Break down boxes flat before recycling."},
    "glass":     {"emoji": "🫙", "tags": ["Recyclable", "Bin 4", "Fragile"],      "description": "Rinse bottles. Place in glass recycling bin."},
}

@app.route("/predict", methods=["POST"])
def predict():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files["file"]
    img = Image.open(io.BytesIO(file.read())).convert("RGB")

    results = model(img, imgsz=224)
    probs = results[0].probs

    label = model.names[probs.top1]          # e.g. "plastic"
    confidence = round(float(probs.top1conf) * 100, 1)

    meta = CLASS_META.get(label, {
        "emoji": "♻️",
        "tags": ["Unknown"],
        "description": "Unable to classify. Please sort manually."
    })

    return jsonify({
        "label":       label.capitalize(),
        "confidence":  confidence,
        "emoji":       meta["emoji"],
        "tags":        meta["tags"],
        "description": meta["description"]
    })

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)