from flask import Flask, render_template, request, session, redirect, url_for, jsonify
from flask_socketio import SocketIO, emit, join_room
from flask_login import LoginManager, login_required, current_user, login_user, logout_user
from models.user import User
from models.message import Message
from datetime import datetime
from werkzeug.utils import secure_filename
import os
from dotenv import load_dotenv

load_dotenv()  # Lädt die Umgebungsvariablen aus .env

app = Flask(__name__)
app.config.from_object('config.config')
# Füge erlaubte Dateierweiterungen zur Konfiguration hinzu
app.config['ALLOWED_EXTENSIONS'] = {'txt', 'pdf', 'png', 'jpg', 'jpeg', 'gif'}
app.config['UPLOAD_FOLDER'] = 'static/uploads'  # Stelle sicher, dass auch dieser Pfad definiert ist
socketio = SocketIO(app)
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

@login_manager.user_loader
def load_user(user_id):
    return User.get_by_id(user_id)

@app.route('/')
def index():
    if current_user.is_authenticated:
        return redirect(url_for('chat'))
    return redirect(url_for('login'))

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        try:
            email = request.form.get('email', '')
            password = request.form.get('password', '')
            
            if not email or not password:
                return render_template('login.html', error="E-Mail und Passwort sind erforderlich")
                
            user = User.authenticate(email, password)
            if user:
                login_user(user)
                return redirect(url_for('chat'))
            return render_template('login.html', error="Geçersiz e-posta veya şifre")
        except Exception as e:
            print(f"Fehler beim Login: {str(e)}")
            return render_template('login.html', error="Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.")
    return render_template('login.html')

@app.route('/chat')
@login_required
def chat():
    users = User.get_all_users()
    return render_template('chat.html', users=users, current_user=current_user)

@socketio.on('connect')
def handle_connect():
    # Verbinde den Benutzer mit seinem eigenen Raum
    if current_user.is_authenticated:
        join_room(str(current_user.id))
        print(f"Benutzer {current_user.username} verbunden mit Raum {current_user.id}")

@socketio.on('send_message')
def handle_message(data):
    if not current_user.is_authenticated:
        return {'error': 'User not authenticated'}, 401
    
    print(f"Received message data: {data}")
    
    message = Message.create(
        sender_id=current_user.id,
        receiver_id=data['receiver_id'],
        content=data['message'],
        message_type=data['type']
    )
    
    if message:
        # Konvertiere datetime zu String
        if 'created_at' in message and message['created_at']:
            message['created_at'] = message['created_at'].strftime('%Y-%m-%d %H:%M:%S')
        
        print(f"Sending message: {message}")
        
        # Sende an den Empfänger
        emit('new_message', message, room=str(data['receiver_id']))
        # Sende an den Sender zurück
        emit('new_message', message, room=str(current_user.id))

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('login'))

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        print("Keine Datei im Request gefunden")
        return jsonify({'success': False, 'error': 'No file part'}), 400
        
    file = request.files['file']
    if file.filename == '':
        print("Leerer Dateiname")
        return jsonify({'success': False, 'error': 'No selected file'}), 400
        
    # Füge webm zu den erlaubten Dateitypen hinzu
    allowed_extensions = {'png', 'jpg', 'jpeg', 'gif', 'mp3', 'wav', 'webm', 'ogg'}
    
    # Prüfe Dateiendung
    extension = file.filename.rsplit('.', 1)[1].lower() if '.' in file.filename else ''
    if extension not in allowed_extensions:
        print(f"Nicht erlaubter Dateityp: {extension}")
        return jsonify({'success': False, 'error': f'File type not allowed: {extension}'}), 400
    
    # Generiere eindeutigen Dateinamen
    timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
    filename = f'voice_{timestamp}.{extension}'
    
    # Stelle sicher, dass der Upload-Ordner existiert
    upload_folder = os.path.join('static', 'uploads')
    os.makedirs(upload_folder, exist_ok=True)
    
    # Speichere die Datei
    filepath = os.path.join(upload_folder, filename)
    file.save(filepath)
    
    # Gib den URL-Pfad zurück
    file_url = url_for('static', filename=f'uploads/{filename}')
    print(f"Datei erfolgreich hochgeladen: {file_url}")
    
    return jsonify({
        'success': True,
        'file_path': file_url
    })

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form['username']
        email = request.form['email']
        password = request.form['password']
        
        if User.create(username, email, password):
            user = User.authenticate(email, password)
            if user:
                login_user(user)
                return redirect(url_for('chat'))
        return render_template('register.html', error="Kayıt başarısız oldu. Lütfen tekrar deneyin.")
    
    return render_template('register.html')

@app.route('/get_chat/<int:other_user_id>')
@login_required
def get_chat(other_user_id):
    messages = Message.get_chat_messages(current_user.id, other_user_id)
    
    # Konvertiere datetime-Objekte zu Strings
    for message in messages:
        if 'created_at' in message and message['created_at']:
            message['created_at'] = message['created_at'].strftime('%Y-%m-%d %H:%M:%S')
    
    return jsonify(messages)

@app.before_request
def update_last_seen():
    if current_user.is_authenticated:
        User.update_last_seen(current_user.id)

@app.route('/get_users')
@login_required
def get_users():
    users = User.get_all_users()
    
    # Konvertiere datetime-Objekte zu Strings
    for user in users:
        if 'last_seen' in user and user['last_seen']:
            user['last_seen'] = user['last_seen'].strftime('%Y-%m-%d %H:%M:%S')
    
    return jsonify(users)

@app.route('/mark_as_read/<int:message_id>', methods=['POST'])
@login_required
def mark_as_read(message_id):
    success = Message.mark_as_read(message_id, current_user.id)
    return jsonify({'success': success})

@app.route('/update_username', methods=['POST'])
@login_required
def update_username():
    data = request.json
    new_username = data.get('username')
    
    if not new_username:
        return jsonify({'success': False, 'error': 'Kullanıcı adı boş olamaz'})
    
    success = User.update_username(current_user.id, new_username)
    
    if success:
        return jsonify({'success': True})
    else:
        return jsonify({'success': False, 'error': 'Bu kullanıcı adı zaten kullanılıyor'})

@app.route('/delete_message/<int:message_id>', methods=['DELETE'])
@login_required
def delete_message(message_id):
    try:
        # Überprüfe, ob die Nachricht dem aktuellen Benutzer gehört
        message = Message.get_by_id(message_id)
        
        if not message:
            return jsonify({'success': False, 'error': 'Nachricht nicht gefunden'}), 404
        
        if message.sender_id != current_user.id:
            return jsonify({'success': False, 'error': 'Keine Berechtigung zum Löschen dieser Nachricht'}), 403
        
        # Lösche die Nachricht
        Message.delete(message_id)
        
        return jsonify({'success': True})
    except Exception as e:
        print(f"Fehler beim Löschen der Nachricht: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

if __name__ == '__main__':
    socketio.run(app, debug=True) 