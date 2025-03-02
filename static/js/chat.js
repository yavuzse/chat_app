let socket = io();
let selectedUserId = null;
const currentUserId = document.querySelector('.current-user').dataset.userId;

// Fügen Sie diese Variablen am Anfang der Datei hinzu
let mediaRecorder;
let audioChunks = [];
let isRecording = false;
let recordingTimer;
let recordingDuration = 0;

// Globale Variable für die aktuell ausgewählte Nachricht zum Löschen
let selectedMessageToDelete = null;

// DOM Elements
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const attachBtn = document.getElementById('attach-btn');
const fileInput = document.getElementById('file-input');
const messagesDiv = document.getElementById('messages');
const selectedUserSpan = document.getElementById('selected-user');
const voiceBtn = document.getElementById('voice-btn');
const recordingIndicator = document.getElementById('recording-indicator');

// Event Listeners
document.querySelectorAll('.user').forEach(userDiv => {
    userDiv.addEventListener('click', () => {
        // Remove active class from all users
        document.querySelectorAll('.user').forEach(u => u.classList.remove('active'));
        // Add active class to selected user
        userDiv.classList.add('active');
        
        selectedUserId = userDiv.dataset.userId;
        selectedUserSpan.textContent = userDiv.querySelector('span').textContent;
        
        // Enable input and buttons
        messageInput.disabled = false;
        sendBtn.disabled = false;
        attachBtn.disabled = false;
        voiceBtn.disabled = false;
        
        // Clear messages
        messagesDiv.innerHTML = '';
        
        // Load chat history
        loadChatHistory(selectedUserId);
        
        // Clear unread count
        const unreadCount = document.getElementById(`unread-${selectedUserId}`);
        if (unreadCount) {
            unreadCount.style.display = 'none';
        }
        
        // Son görülme bilgisini güncelle
        const lastSeen = userDiv.dataset.lastSeen;
        const selectedUserStatus = document.getElementById('selected-user-status');
        selectedUserStatus.textContent = formatLastSeen(lastSeen);
    });
});

sendBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

attachBtn.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', handleFileUpload);

// Fügen Sie diesen Event-Listener hinzu
voiceBtn.addEventListener('click', toggleVoiceRecording);

// Socket events
socket.on('connect', () => {
    console.log('Connected to server');
});

socket.on('new_message', (message) => {
    console.log('Neue Nachricht erhalten:', message);
    
    // Prüfe, ob die Nachricht für den aktuellen Chat relevant ist
    if ((message.sender_id == selectedUserId && message.receiver_id == currentUserId) || 
        (message.receiver_id == selectedUserId && message.sender_id == currentUserId)) {
        appendMessage(message);
    } else if (message.sender_id != currentUserId) {
        // Wenn die Nachricht von jemand anderem kommt und nicht im aktuellen Chat ist
        const unreadCount = document.getElementById(`unread-${message.sender_id}`);
        if (unreadCount) {
            const count = parseInt(unreadCount.textContent) || 0;
            unreadCount.textContent = count + 1;
            unreadCount.style.display = 'inline';
        }
    }
});

// Functions
function sendMessage() {
    const content = messageInput.value.trim();
    if (content && selectedUserId) {
        socket.emit('send_message', {
            receiver_id: selectedUserId,
            message: content,
            type: 'text'
        });
        messageInput.value = '';
    }
}

async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            socket.emit('send_message', {
                receiver_id: selectedUserId,
                message: data.file_path,
                type: file.type.startsWith('image/') ? 'photo' : 'voice'
            });
        }
    } catch (error) {
        console.error('Error uploading file:', error);
    }
    
    // Clear file input
    fileInput.value = '';
}

async function loadChatHistory(userId) {
    try {
        const response = await fetch(`/get_chat/${userId}`);
        const messages = await response.json();
        
        messages.forEach(message => {
            appendMessage(message);
        });
        
        // Scroll to bottom
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    } catch (error) {
        console.error('Error loading chat history:', error);
    }
}

// Funktion zum Erstellen eines benutzerdefinierten Audio-Players
function createCustomAudioPlayer(audioElement, container) {
    // Container erstellen
    const audioContainer = document.createElement('div');
    audioContainer.className = 'audio-message-container';
    
    // Play-Button erstellen
    const playButton = document.createElement('button');
    playButton.className = 'audio-play-button';
    playButton.innerHTML = '<i class="fas fa-play"></i>';
    
    // Waveform erstellen
    const waveform = document.createElement('div');
    waveform.className = 'audio-waveform';
    
    const waveformProgress = document.createElement('div');
    waveformProgress.className = 'audio-waveform-progress';
    
    waveform.appendChild(waveformProgress);
    
    // Dauer-Anzeige erstellen
    const duration = document.createElement('div');
    duration.className = 'audio-duration';
    duration.textContent = '0:00';
    
    // Elemente zum Container hinzufügen
    audioContainer.appendChild(playButton);
    audioContainer.appendChild(waveform);
    audioContainer.appendChild(duration);
    
    // Event-Listener für den Play-Button
    playButton.addEventListener('click', () => {
        if (audioElement.paused) {
            // Alle anderen Audio-Elemente pausieren
            document.querySelectorAll('audio').forEach(audio => {
                if (audio !== audioElement && !audio.paused) {
                    audio.pause();
                    // Den entsprechenden Play-Button aktualisieren
                    const parentMsg = audio.closest('.message');
                    if (parentMsg) {
                        const btn = parentMsg.querySelector('.audio-play-button i');
                        if (btn) btn.className = 'fas fa-play';
                    }
                }
            });
            
            audioElement.play();
            playButton.innerHTML = '<i class="fas fa-pause"></i>';
        } else {
            audioElement.pause();
            playButton.innerHTML = '<i class="fas fa-play"></i>';
        }
    });
    
    // Event-Listener für das Audio-Element
    audioElement.addEventListener('timeupdate', () => {
        const currentTime = audioElement.currentTime;
        const totalTime = audioElement.duration || 0;
        const progress = (currentTime / totalTime) * 100;
        
        waveformProgress.style.width = `${progress}%`;
        
        const minutes = Math.floor(currentTime / 60);
        const seconds = Math.floor(currentTime % 60);
        duration.textContent = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    });
    
    audioElement.addEventListener('ended', () => {
        playButton.innerHTML = '<i class="fas fa-play"></i>';
        waveformProgress.style.width = '0%';
    });
    
    audioElement.addEventListener('loadedmetadata', () => {
        const totalTime = audioElement.duration || 0;
        const minutes = Math.floor(totalTime / 60);
        const seconds = Math.floor(totalTime % 60);
        duration.textContent = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    });
    
    // Klick auf die Waveform, um zu einer bestimmten Position zu springen
    waveform.addEventListener('click', (e) => {
        const rect = waveform.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        audioElement.currentTime = pos * audioElement.duration;
    });
    
    return audioContainer;
}

// Überschreibe die appendMessage-Funktion, um den Löschbutton hinzuzufügen
function appendMessage(message) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message');
    messageDiv.dataset.messageId = message.id; // Wichtig: Speichere die Nachrichten-ID
    
    // Bestimme, ob die Nachricht vom aktuellen Benutzer gesendet wurde
    const isSentByMe = message.sender_id == currentUserId;
    messageDiv.classList.add(isSentByMe ? 'sent' : 'received');
    
    // Füge den Absendernamen hinzu
    const senderName = isSentByMe ? 'Siz' : message.sender_username || 'Diğer kullanıcı';
    
    // Okundu tiklerini ekleyelim
    const messageStatus = isSentByMe ? 
        `<div class="message-status">
            <i class="fas fa-check${message.is_read ? ' read' : ''}"></i>
            <i class="fas fa-check${message.is_read ? ' read' : ''}"></i>
        </div>` : '';
    
    let contentHTML = '';
    
    if (message.message_type === 'photo') {
        contentHTML = `<img src="${message.content}" alt="Photo">`;
    } else if (message.message_type === 'voice') {
        contentHTML = `<audio controls src="${message.content}"></audio>`;
    } else {
        contentHTML = message.content;
    }
    
    // Löschbutton nur für eigene Nachrichten anzeigen
    const deleteButton = isSentByMe ? 
        `<div class="message-actions">
            <button class="delete-message-btn" onclick="showDeleteConfirmDialog('${message.id}')">
                <i class="fas fa-trash-alt"></i>
            </button>
        </div>` : '';
    
    messageDiv.innerHTML = `
        ${deleteButton}
        <div class="sender-name">${senderName}</div>
        <div class="content">${contentHTML}</div>
        <div class="time">${formatDate(message.created_at)}</div>
        ${messageStatus}
    `;
    
    // Wenn es eine Sprachnachricht ist, erstelle den benutzerdefinierten Audio-Player
    if (message.message_type === 'voice') {
        const audioElement = messageDiv.querySelector('audio');
        const contentDiv = messageDiv.querySelector('.content');
        
        if (audioElement && contentDiv) {
            const customPlayer = createCustomAudioPlayer(audioElement, contentDiv);
            contentDiv.appendChild(customPlayer);
        }
    }
    
    messagesDiv.appendChild(messageDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Fügen Sie diese Funktionen hinzu
function toggleVoiceRecording() {
    if (!isRecording) {
        startRecording();
        voiceBtn.classList.add('recording');
    } else {
        stopRecording();
        voiceBtn.classList.remove('recording');
    }
}

async function startRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        
        mediaRecorder.ondataavailable = (event) => {
            audioChunks.push(event.data);
        };
        
        mediaRecorder.onstop = sendAudioMessage;
        
        // Starte die Aufnahme
        audioChunks = [];
        mediaRecorder.start();
        isRecording = true;
        
        // Ändere das Aussehen des Buttons
        voiceBtn.classList.add('recording');
        voiceBtn.innerHTML = '<i class="fas fa-stop"></i>';
        
        // Zeige den Aufnahme-Indikator
        recordingDuration = 0;
        recordingIndicator.style.display = 'block';
        recordingIndicator.textContent = '0:00';
        recordingTimer = setInterval(() => {
            recordingDuration++;
            updateRecordingTime();
        }, 1000);
        
    } catch (error) {
        console.error('Fehler beim Zugriff auf das Mikrofon:', error);
        alert('Mikrofon konnte nicht aktiviert werden. Bitte erteilen Sie die Berechtigung.');
    }
}

function stopRecording() {
    if (mediaRecorder && isRecording) {
        mediaRecorder.stop();
        isRecording = false;
        
        // Stoppe alle Tracks im Stream
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
        
        // Ändere das Aussehen des Buttons zurück
        voiceBtn.classList.remove('recording');
        voiceBtn.innerHTML = '<i class="fas fa-microphone"></i>';
        
        // Verstecke den Aufnahme-Indikator
        recordingIndicator.style.display = 'none';
        
        // Stoppe den Timer
        clearInterval(recordingTimer);
    }
}

function sendAudioMessage() {
    if (audioChunks.length === 0 || !selectedUserId) return;
    
    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
    const formData = new FormData();
    
    // Wichtig: Der Name muss 'file' sein, nicht 'audio'
    formData.append('file', audioBlob, 'voice-message.webm');
    
    console.log("Sende Audiodatei...");
    
    fetch('/upload', {
        method: 'POST',
        body: formData
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        console.log("Upload-Antwort:", data);
        if (data.success) {
            // Hier ist der wichtige Teil - wir senden die Nachricht mit dem richtigen Typ
            socket.emit('send_message', {
                receiver_id: selectedUserId,
                message: data.file_path,
                type: 'voice'
            });
            console.log("Sprachnachricht gesendet:", data.file_path);
        } else {
            console.error("Fehler beim Hochladen:", data.error);
        }
    })
    .catch(error => {
        console.error('Fehler beim Senden der Sprachnachricht:', error);
    });
}

// Fügen Sie diese Funktion hinzu
function formatLastSeen(dateStr) {
    if (!dateStr) return 'Hiç çevrimiçi olmadı';
    
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    
    if (diffSec < 60) {
        return 'Az önce';
    } else if (diffMin < 60) {
        return `${diffMin} dakika önce`;
    } else if (diffHour < 24) {
        return `${diffHour} saat önce`;
    } else if (diffDay < 7) {
        return `${diffDay} gün önce`;
    } else {
        return date.toLocaleDateString('tr-TR', { 
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}

// Mesaj okundu durumunu güncelleyen fonksiyon
function updateMessageReadStatus(messageId) {
    fetch(`/mark_as_read/${messageId}`, {
        method: 'POST'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            console.log(`Mesaj ${messageId} okundu olarak işaretlendi`);
        }
    })
    .catch(error => console.error('Mesaj durumu güncellenirken hata:', error));
}

// Kullanıcı durumunu güncelleyen fonksiyonu geliştirelim
function updateUserStatus() {
    fetch('/get_users')
        .then(response => response.json())
        .then(users => {
            users.forEach(user => {
                // Kullanıcı listesindeki son görülme bilgisini güncelle
                const lastSeenElement = document.getElementById(`last-seen-${user.id}`);
                if (lastSeenElement) {
                    lastSeenElement.textContent = formatLastSeen(user.last_seen);
                }
                
                // Eğer bu kullanıcı şu anda seçiliyse, chat başlığındaki durumu da güncelle
                if (user.id == selectedUserId) {
                    const selectedUserStatus = document.getElementById('selected-user-status');
                    if (selectedUserStatus) {
                        selectedUserStatus.textContent = formatLastSeen(user.last_seen);
                    }
                }
            });
        })
        .catch(error => console.error('Error updating user status:', error));
}

// Rufen Sie die Funktion beim Laden und dann alle 60 Sekunden auf
updateUserStatus();
setInterval(updateUserStatus, 60000);

// Ayarlar menüsü için JavaScript
document.addEventListener('DOMContentLoaded', function() {
    const settingsBtn = document.getElementById('settings-btn');
    const settingsMenu = document.getElementById('settings-menu');
    const closeSettings = document.getElementById('close-settings');
    const saveUsername = document.getElementById('save-username');
    const usernameInput = document.getElementById('username-input');
    const themeCheckbox = document.getElementById('theme-checkbox');
    const currentUsername = document.getElementById('current-username');
    
    // Tema durumunu kontrol et
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
        themeCheckbox.checked = true;
    }
    
    // Ayarlar menüsünü aç
    settingsBtn.addEventListener('click', function() {
        settingsMenu.classList.add('active');
    });
    
    // Ayarlar menüsünü kapat
    closeSettings.addEventListener('click', function() {
        settingsMenu.classList.remove('active');
    });
    
    // Kullanıcı adını kaydet
    saveUsername.addEventListener('click', function() {
        const newUsername = usernameInput.value.trim();
        if (newUsername) {
            fetch('/update_username', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username: newUsername }),
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    currentUsername.textContent = newUsername;
                    alert('Kullanıcı adı başarıyla güncellendi!');
                } else {
                    alert('Hata: ' + data.error);
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('Bir hata oluştu!');
            });
        }
    });
    
    // Tema değiştir
    themeCheckbox.addEventListener('change', function() {
        if (this.checked) {
            document.body.classList.add('dark-theme');
            localStorage.setItem('theme', 'dark');
        } else {
            document.body.classList.remove('dark-theme');
            localStorage.setItem('theme', 'light');
        }
    });
});

// Burger menü için JavaScript kodunu güncelleyelim
document.addEventListener('DOMContentLoaded', function() {
    const menuToggle = document.getElementById('menu-toggle');
    const closeMenu = document.getElementById('close-menu');
    const usersList = document.getElementById('users-list');
    
    // Overlay elementi oluşturalım
    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    document.body.appendChild(overlay);
    
    // Menüyü açma fonksiyonu
    function openMenu() {
        usersList.classList.add('active');
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden'; // Sayfanın kaydırılmasını engelleyelim
    }
    
    // Menüyü kapatma fonksiyonu
    function closeMenuFunc() {
        usersList.classList.remove('active');
        overlay.classList.remove('active');
        document.body.style.overflow = ''; // Sayfanın kaydırılmasını tekrar etkinleştirelim
    }
    
    // Burger menü butonuna tıklama olayı
    menuToggle.addEventListener('click', openMenu);
    
    // Kapatma butonuna tıklama olayı
    closeMenu.addEventListener('click', closeMenuFunc);
    
    // Overlay'e tıklama olayı
    overlay.addEventListener('click', closeMenuFunc);
    
    // ESC tuşuna basma olayı
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && usersList.classList.contains('active')) {
            closeMenuFunc();
        }
    });
    
    // Kullanıcı seçildiğinde menüyü kapatma
    document.querySelectorAll('.user').forEach(userDiv => {
        userDiv.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                closeMenuFunc();
            }
        });
    });
});

// Mobiler Einstellungsbutton
document.addEventListener('DOMContentLoaded', function() {
    const settingsBtnMobile = document.getElementById('settings-btn-mobile');
    
    if (settingsBtnMobile) {
        settingsBtnMobile.addEventListener('click', function() {
            const settingsMenu = document.getElementById('settings-menu');
            settingsMenu.classList.add('active');
            
            // Schließe das Burger-Menü
            const usersList = document.getElementById('users-list');
            const overlay = document.querySelector('.overlay');
            usersList.classList.remove('active');
            if (overlay) overlay.classList.remove('active');
        });
    }
});

// Aktualisiere die Anzeige der Aufnahmezeit
function updateRecordingTime() {
    recordingDuration++;
    const minutes = Math.floor(recordingDuration / 60);
    const seconds = recordingDuration % 60;
    recordingIndicator.textContent = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

// Fügen Sie diese Funktion hinzu, um alle vorhandenen Sprachnachrichten zu aktualisieren
function updateExistingAudioPlayers() {
    document.querySelectorAll('.message audio').forEach(audioElement => {
        const contentDiv = audioElement.closest('.content');
        if (contentDiv && !contentDiv.querySelector('.audio-message-container')) {
            const customPlayer = createCustomAudioPlayer(audioElement, contentDiv);
            contentDiv.appendChild(customPlayer);
        }
    });
}

// Rufen Sie diese Funktion auf, wenn die Seite geladen wird
document.addEventListener('DOMContentLoaded', function() {
    // Andere DOMContentLoaded-Ereignisse...
    
    // Aktualisieren Sie vorhandene Audio-Player
    setTimeout(updateExistingAudioPlayers, 1000);
});

// Funktion zum Anzeigen des Löschdialogs
function showDeleteConfirmDialog(messageId) {
    selectedMessageToDelete = messageId;
    document.getElementById('delete-confirm-dialog').classList.add('active');
    document.getElementById('overlay-dark').classList.add('active');
}

// Funktion zum Schließen des Löschdialogs
function closeDeleteConfirmDialog() {
    document.getElementById('delete-confirm-dialog').classList.remove('active');
    document.getElementById('overlay-dark').classList.remove('active');
    selectedMessageToDelete = null;
}

// Funktion zum Löschen einer Nachricht
async function deleteMessage() {
    if (!selectedMessageToDelete) return;
    
    try {
        const response = await fetch(`/delete_message/${selectedMessageToDelete}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Entferne die Nachricht aus dem DOM
            const messageElement = document.querySelector(`.message[data-message-id="${selectedMessageToDelete}"]`);
            if (messageElement) {
                messageElement.remove();
            }
            
            // Informiere den Server, dass die Nachricht gelöscht wurde
            socket.emit('message_deleted', {
                message_id: selectedMessageToDelete,
                receiver_id: selectedUserId
            });
        } else {
            console.error('Fehler beim Löschen der Nachricht:', data.error);
        }
    } catch (error) {
        console.error('Fehler beim Löschen der Nachricht:', error);
    }
    
    closeDeleteConfirmDialog();
}

// Socket-Event für gelöschte Nachrichten
socket.on('message_deleted', (data) => {
    const messageElement = document.querySelector(`.message[data-message-id="${data.message_id}"]`);
    if (messageElement) {
        messageElement.remove();
    }
});

// Event-Listener für den Bestätigungsdialog
document.addEventListener('DOMContentLoaded', function() {
    // Erstelle den Bestätigungsdialog
    const dialogHTML = `
        <div id="overlay-dark" class="overlay-dark"></div>
        <div id="delete-confirm-dialog" class="delete-confirm-dialog">
            <h3>Nachricht löschen</h3>
            <p>Möchten Sie diese Nachricht wirklich löschen?</p>
            <div class="delete-confirm-actions">
                <button class="delete-cancel-btn" onclick="closeDeleteConfirmDialog()">Abbrechen</button>
                <button class="delete-confirm-btn" onclick="deleteMessage()">Löschen</button>
            </div>
        </div>
    `;
    
    // Füge den Dialog zum Body hinzu
    document.body.insertAdjacentHTML('beforeend', dialogHTML);
    
    // Schließe den Dialog, wenn auf den Overlay geklickt wird
    document.getElementById('overlay-dark').addEventListener('click', closeDeleteConfirmDialog);
}); 