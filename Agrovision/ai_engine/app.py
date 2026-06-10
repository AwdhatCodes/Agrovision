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


# --- PHASE 3: THE FIXED, OFFICIAL KERAS GRAD-CAM ---
def generate_gradcam(img_array, image_bytes, ai_model):
    print("DEBUG: Starting Grad-CAM generation...") 
    try:
        # 1. Safely locate the final convolutional layer without assuming naming conventions
        last_conv_layer_name = None
        
        # We search backwards through the model layers
        for layer in reversed(ai_model.layers):
            if isinstance(layer, tf.keras.layers.Conv2D):
                last_conv_layer_name = layer.name
                break
                
        # Fallback if specific layers are wrapped
        if not last_conv_layer_name:
            for layer in reversed(ai_model.layers):
                if len(layer.output_shape) == 4: # Standard shape for visual feature maps
                    last_conv_layer_name = layer.name
                    break

        if not last_conv_layer_name: 
            print("DEBUG: Failed to find any suitable 2D layer for Grad-CAM!") 
            return None
            
        print(f"DEBUG: Tapping into model at layer: {last_conv_layer_name}") 
            
        # 2. Use Official Keras API to create a multi-output model (DOES NOT break the graph!)
        grad_model = tf.keras.models.Model(
            inputs=[ai_model.inputs], 
            outputs=[ai_model.get_layer(last_conv_layer_name).output, ai_model.output]
        )
        
        # 3. Execute the math
        with tf.GradientTape() as tape:
            # Get the conv_layer output and the final predictions simultaneously
            conv_outputs, predictions = grad_model(img_array)
            
            # Watch the intermediate conv_outputs with the tape
            tape.watch(conv_outputs)
            
            # Isolate the exact score for the predicted disease
            predicted_class = tf.argmax(predictions[0])
            loss = predictions[:, predicted_class]
            
        # 4. Calculate gradients of the loss with respect to the conv layer
        grads = tape.gradient(loss, conv_outputs)
        
        if grads is None:
            print("DEBUG: Gradients are None. Model might not be differentiable at this layer.")
            return None
            
        # Pool the gradients
        pooled_grads = tf.reduce_mean(grads, axis=(0, 1, 2))
        
        # 5. Combine with the feature maps
        conv_outputs = conv_outputs[0]
        heatmap = tf.reduce_sum(tf.multiply(pooled_grads, conv_outputs), axis=-1)
        
        # Apply ReLU (discard negative values) and Normalize
        heatmap = np.maximum(heatmap, 0)
        max_heat = np.max(heatmap)
        if max_heat != 0: 
            heatmap /= max_heat
            
        # 6. Paint the heatmap onto the original image
        np_img = np.frombuffer(image_bytes, np.uint8)
        cv_img = cv2.imdecode(np_img, cv2.IMREAD_COLOR)
        
        # Shrink the image so the browser payload isn't gigantic
        max_dim = 800
        h, w = cv_img.shape[:2]
        if max(h, w) > max_dim:
            scale = max_dim / max(h, w)
            cv_img = cv2.resize(cv_img, (int(w * scale), int(h * scale)))
        
        heatmap = cv2.resize(heatmap, (cv_img.shape[1], cv_img.shape[0]))
        heatmap = np.uint8(255 * heatmap)
        heatmap_color = cv2.applyColorMap(heatmap, cv2.COLORMAP_JET)
        
        # Superimpose
        superimposed_img = cv2.addWeighted(cv_img, 0.6, heatmap_color, 0.4, 0)
        _, buffer = cv2.imencode('.jpg', superimposed_img)
        
        # Safely convert to base64
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
        
        predictions = model.predict(img_array, verbose=0)
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
        app.logger.exception('AI predict failed')
        return jsonify({'success': False, 'error': 'Server crash in predict'}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5002, debug=True)