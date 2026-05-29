import os
import numpy as np
import cv2
import base64
import tensorflow as tf
from flask import Flask, request, jsonify
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing import image
from PIL import Image
import io
import traceback 

app = Flask(__name__)

# Load your trained 3.7-million parameter brain
MODEL_PATH = 'potato_disease_model.h5'
print("Loading AI Model... Please wait.")
model = load_model(MODEL_PATH)
print("Model successfully loaded and ready for predictions!")

CLASS_NAMES = ['Early Blight', 'Late Blight', 'Healthy'] 

# --- PHASE 2: OpenCV Severity Function ---
def calculate_severity(image_bytes):
    np_img = np.frombuffer(image_bytes, np.uint8)
    cv_img = cv2.imdecode(np_img, cv2.IMREAD_COLOR)
    hsv = cv2.cvtColor(cv_img, cv2.COLOR_BGR2HSV)
    
    lower_green = np.array([25, 40, 40])
    upper_green = np.array([90, 255, 255])
    green_mask = cv2.inRange(hsv, lower_green, upper_green)
    
    lower_brown = np.array([10, 10, 20])
    upper_brown = np.array([24, 255, 255])
    brown_mask = cv2.inRange(hsv, lower_brown, upper_brown)
    
    healthy_pixels = cv2.countNonZero(green_mask)
    diseased_pixels = cv2.countNonZero(brown_mask)
    total_leaf_pixels = healthy_pixels + diseased_pixels
    
    if total_leaf_pixels == 0: return 0.0
    return round((diseased_pixels / total_leaf_pixels) * 100, 2)


# --- PHASE 3: THE SPLIT-MODEL GRAD-CAM WITH COMPRESSION ---
def generate_gradcam(img_array, image_bytes, ai_model):
    print("DEBUG: Starting Grad-CAM generation...") 
    try:
        # 1. Find the target layer and its exact index
        last_conv_layer_name = None
        last_conv_idx = -1
        for i, layer in enumerate(ai_model.layers):
            if 'conv2d' in layer.name.lower():
                last_conv_layer_name = layer.name
                last_conv_idx = i
        
        if last_conv_idx == -1: 
            print("DEBUG: Failed to find a conv2d layer!") 
            return None
            
        print(f"DEBUG: Found target layer: {last_conv_layer_name} at index {last_conv_idx}") 
            
        # 2. Build Model 1 (Input -> Convolutional Layer)
        img_input = tf.keras.Input(shape=(256, 256, 3))
        x = img_input
        for layer in ai_model.layers[:last_conv_idx + 1]:
            # Skip any existing input layers to avoid Keras conflicts
            if layer.__class__.__name__ == 'InputLayer':
                continue
            x = layer(x)
        model_1 = tf.keras.Model(inputs=img_input, outputs=x)
        
        # 3. Build Model 2 (Convolutional Layer -> Final Prediction)
        # We start this model right where Model 1 left off
        conv_input = tf.keras.Input(shape=model_1.output.shape[1:])
        x = conv_input
        for layer in ai_model.layers[last_conv_idx + 1:]:
            x = layer(x)
        model_2 = tf.keras.Model(inputs=conv_input, outputs=x)
        
        # 4. Execute the math!
        with tf.GradientTape() as tape:
            img_tensor = tf.cast(img_array, tf.float32)
            
            # Run the first half
            conv_outputs = model_1(img_tensor)
            
            # CRITICAL: Force the tape to watch this hand-off!
            tape.watch(conv_outputs)
            
            # Run the second half
            predictions = model_2(conv_outputs)
            
            predicted_class = tf.argmax(predictions[0])
            loss = predictions[:, predicted_class]
            
        # 5. Calculate gradients
        grads = tape.gradient(loss, conv_outputs)
        
        if grads is None:
            print("DEBUG: Gradients are STILL None. This shouldn't happen.")
            return None
            
        pooled_grads = tf.reduce_mean(grads, axis=(0, 1, 2))
        
        conv_outputs = conv_outputs[0]
        heatmap = tf.reduce_sum(tf.multiply(pooled_grads, conv_outputs), axis=-1)
        
        # Apply ReLU (discard negative values) and Normalize
        heatmap = np.maximum(heatmap, 0)
        max_heat = np.max(heatmap)
        if max_heat != 0: 
            heatmap /= max_heat
            
        # 6. Paint the heatmap onto the original image (WITH BROWSER COMPRESSION)
        np_img = np.frombuffer(image_bytes, np.uint8)
        cv_img = cv2.imdecode(np_img, cv2.IMREAD_COLOR)
        
        # --- THE FIX: Shrink the image so the browser doesn't panic! ---
        max_dim = 800
        h, w = cv_img.shape[:2]
        if max(h, w) > max_dim:
            scale = max_dim / max(h, w)
            cv_img = cv2.resize(cv_img, (int(w * scale), int(h * scale)))
        # ---------------------------------------------------------------
        
        heatmap = cv2.resize(heatmap, (cv_img.shape[1], cv_img.shape[0]))
        heatmap = np.uint8(255 * heatmap)
        heatmap_color = cv2.applyColorMap(heatmap, cv2.COLORMAP_JET)
        
        superimposed_img = cv2.addWeighted(cv_img, 0.6, heatmap_color, 0.4, 0)
        _, buffer = cv2.imencode('.jpg', superimposed_img)
        
        # Added .tobytes() for extra safety in Python 3!
        img_base64 = base64.b64encode(buffer.tobytes()).decode('utf-8')
        
        print("DEBUG: Heatmap successfully encoded and sent to UI!") 
        return f"data:image/jpeg;base64,{img_base64}"
    
    except Exception as e:
        print(f"Grad-CAM crashed: {e}") 
        traceback.print_exc()
        return None

@app.route('/predict', methods=['POST'])
def predict():
    if 'file' not in request.files: return jsonify({'error': 'No file'}), 400
    file = request.files['file']
    if file.filename == '': return jsonify({'error': 'No file selected'}), 400

    try:
        img_bytes = file.read()
        
        img = Image.open(io.BytesIO(img_bytes))
        if img.mode != 'RGB':
            img = img.convert('RGB')
            
        img = img.resize((256, 256))
        
        img_array = image.img_to_array(img)
        img_array = np.expand_dims(img_array, axis=0) 
        
        predictions = model.predict(img_array)
        predicted_class_index = np.argmax(predictions[0])
        confidence_score = round(100 * float(np.max(predictions[0])), 2)
        predicted_diagnosis = CLASS_NAMES[predicted_class_index]
        
        severity_percentage = 0.0
        heatmap_base64 = None
        
        if predicted_diagnosis != 'Healthy':
            try:
                severity_percentage = calculate_severity(img_bytes)
                heatmap_base64 = generate_gradcam(img_array, img_bytes, model)
            except Exception as e:
                print("--- WARNING: Grad-CAM failed, but prediction still works ---")
                traceback.print_exc() 

        return jsonify({
            'success': True,
            'diagnosis': predicted_diagnosis,
            'confidence': confidence_score,
            'affected_area_pct': severity_percentage,
            'heatmap': heatmap_base64
        })

    except Exception:
        traceback.print_exc()
        return jsonify({'success': False, 'error': 'Server crash in predict'}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5002, debug=True)