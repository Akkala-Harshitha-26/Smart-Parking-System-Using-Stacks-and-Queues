# server.py
from flask import Flask, jsonify, request
from collections import deque
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Initialize parking sections with dynamic sizing
stack = []  # LIFO
queue = deque()  # FIFO
car_count = 0  # For generating unique car IDs
MAX_SPOTS_PER_ROW = 5  # Number of spots to display per row
DEFAULT_MAX_SPOTS = 10  # Default maximum spots

# Function to create a car object
def create_car(car_id, color="#3498db"):
    global car_count
    if not car_id:
        car_count += 1
        car_id = f"Car-{car_count}"
    
    return {
        "id": car_id,
        "color": color,
        "timestamp": request.json.get('timestamp', None)
    }

@app.route('/state', methods=['GET'])
def get_state():
    # Get the maximum spots from query parameters, or use default
    max_spots = request.args.get('max_spots', DEFAULT_MAX_SPOTS, type=int)
    
    # Create proper stack and queue lists
    stack_list = []
    for car in stack:
        if isinstance(car, dict):
            stack_list.append(car)
        else:
            # Convert legacy string car IDs to new format
            stack_list.append({"id": car, "color": "#3498db"})
    
    queue_list = []
    for car in queue:
        if isinstance(car, dict):
            queue_list.append(car)
        else:
            # Convert legacy string car IDs to new format
            queue_list.append({"id": car, "color": "#3498db"})
    
    # Pad with None values to reach max_spots
    stack_list = stack_list + [None] * (max_spots - len(stack_list))
    queue_list = list(queue_list) + [None] * (max_spots - len(queue_list))
    
    # Return the state with additional metadata
    response = jsonify({
        'stack': stack_list,
        'queue': queue_list,
        'max_spots': max_spots,
        'max_spots_per_row': MAX_SPOTS_PER_ROW,
        'stack_count': len(stack),
        'queue_count': len(queue),
        'total_count': len(stack) + len(queue)
    })
    return response

@app.route('/park_stack', methods=['POST', 'OPTIONS'])
def park_stack():
    if request.method == 'OPTIONS':
        return handle_preflight()
    
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
            
        car_id = data.get('car_id', '')
        color = data.get('color', '#3498db')
        
        # Create a car object
        car = create_car(car_id, color)
        
        # Add to stack (no maximum limit)
        stack.append(car)
        
        # Return updated state
        return get_state()
    except Exception as e:
        print(f"Error in park_stack: {str(e)}")
        return jsonify({'error': f'Server error: {str(e)}'}), 500

@app.route('/park_queue', methods=['POST', 'OPTIONS'])
def park_queue():
    if request.method == 'OPTIONS':
        return handle_preflight()
    
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
            
        car_id = data.get('car_id', '')
        color = data.get('color', '#3498db')
        
        # Create a car object
        car = create_car(car_id, color)
        
        # Add to queue (no maximum limit)
        queue.append(car)
        
        # Return updated state
        return get_state()
    except Exception as e:
        print(f"Error in park_queue: {str(e)}")
        return jsonify({'error': f'Server error: {str(e)}'}), 500

@app.route('/remove_stack', methods=['POST', 'OPTIONS'])
def remove_stack():
    if request.method == 'OPTIONS':
        return handle_preflight()
    
    try:
        if stack:
            stack.pop()
            return get_state()
        return jsonify({'error': 'No cars in stack section'})
    except Exception as e:
        print(f"Error in remove_stack: {str(e)}")
        return jsonify({'error': f'Server error: {str(e)}'}), 500

@app.route('/remove_queue', methods=['POST', 'OPTIONS'])
def remove_queue():
    if request.method == 'OPTIONS':
        return handle_preflight()
    
    try:
        if queue:
            queue.popleft()
            return get_state()
        return jsonify({'error': 'No cars in queue section'})
    except Exception as e:
        print(f"Error in remove_queue: {str(e)}")
        return jsonify({'error': f'Server error: {str(e)}'}), 500

@app.route('/clear_all', methods=['POST', 'OPTIONS'])
def clear_all():
    if request.method == 'OPTIONS':
        return handle_preflight()
    
    try:
        global stack, queue
        stack = []
        queue = deque()
        return get_state()
    except Exception as e:
        print(f"Error in clear_all: {str(e)}")
        return jsonify({'error': f'Server error: {str(e)}'}), 500

def handle_preflight():
    response = jsonify({'status': 'ok'})
    return response

if __name__ == '__main__':
    # Run `python server.py` to start the server
    # Ensure Flask is installed: `pip install flask`
    # Also ensure flask-cors is installed: `pip install flask-cors`
    # Server runs on http://localhost:5000
    app.run(debug=True)