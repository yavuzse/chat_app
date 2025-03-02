# Chat Application

A modern, real-time chat application built with Flask and Socket.IO, featuring a sleek dark-themed interface.

## Features

- **Real-time Messaging**: Instant message delivery using Socket.IO
- **User Authentication**: Secure login and registration system
- **Message Types**: Support for text, images, and voice messages
- **Message Management**: Delete messages with confirmation dialog
- **Read Receipts**: See when messages have been read
- **User Status**: Track when users were last active
- **Responsive Design**: Works on desktop and mobile devices
- **Dark Theme**: Easy on the eyes with a modern dark interface

## Technology Stack

- **Backend**: Flask (Python)
- **Real-time Communication**: Socket.IO
- **Database**: MySQL
- **Frontend**: HTML, CSS, JavaScript
- **UI Components**: Font Awesome icons

## Installation

### Prerequisites

- Python 3.7+
- MySQL

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/chat-application.git
   cd chat-application
   ```

2. Create a virtual environment and activate it:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Set up the database:
   ```bash
   mysql -u root -p < database/schema.sql
   ```

5. Create a `.env` file based on `.env-example`:
   ```bash
   cp .env-example .env
   ```
   Then edit the `.env` file with your database credentials and application settings.

6. Run the application:
   ```bash
   python app.py
   ```

7. Access the application at `http://localhost:5000`

## Project Structure

```
chat-application/
├── app.py                  # Main application file
├── config/                 # Configuration files
│   └── config.py           # Application configuration
├── database/               # Database related files
│   └── schema.sql          # Database schema
├── models/                 # Data models
│   ├── message.py          # Message model
│   └── user.py             # User model
├── static/                 # Static files
│   ├── css/                # CSS files
│   │   └── chat.css        # Main stylesheet
│   ├── js/                 # JavaScript files
│   │   └── chat.js         # Client-side logic
│   └── uploads/            # User uploaded files
├── templates/              # HTML templates
│   ├── chat.html           # Main chat interface
│   ├── login.html          # Login page
│   └── register.html       # Registration page
├── .env                    # Environment variables
├── .env-example            # Example environment file
├── .gitignore              # Git ignore file
└── requirements.txt        # Python dependencies
```

## Usage

1. Register a new account or log in with existing credentials
2. Select a user from the list to start chatting
3. Type messages in the input field and press Enter or click the send button
4. Use the attachment button to send images
5. Use the microphone button to record and send voice messages
6. Hover over your messages to see the delete option

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit your changes: `git commit -m 'Add some feature'`
4. Push to the branch: `git push origin feature-name`
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- [Flask](https://flask.palletsprojects.com/)
- [Socket.IO](https://socket.io/)
- [Font Awesome](https://fontawesome.com/)
