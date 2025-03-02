const socket = io();
const messageForm = document.getElementById('message-form');
const messageInput = document.getElementById('message');
const messagesDiv = document.getElementById('messages');
const fileInput = document.getElementById('file-input');
const voiceRecordButton = document.getElementById('voice-record');

messageForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const message = messageInput.value;
    if (message.trim()) {
        socket.emit('send_message', {
            message: message,
            type: 'text'
        });
        messageInput.value = '';
    }
});

socket.on('new_message', (data) => {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message');
    
    if (data.message_type === 'text') {
        messageElement.textContent = data.content;
    } else if (data.message_type === 'photo') {
        const img = document.createElement('img');
        img.src = data.file_path;
        messageElement.appendChild(img);
    } else if (data.message_type === 'voice') {
        const audio = document.createElement('audio');
        audio.controls = true;
        audio.src = data.file_path;
        messageElement.appendChild(audio);
    }
    
    messagesDiv.appendChild(messageElement);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
});

// Dosya yükleme işlemi
fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        if (data.success) {
            socket.emit('send_message', {
                message: data.file_path,
                type: file.type.startsWith('image/') ? 'photo' : 'voice'
            });
        }
    }
}); 