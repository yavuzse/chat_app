import mysql.connector
from dotenv import load_dotenv
import os

# Lade Umgebungsvariablen
load_dotenv()

# Datenbankverbindungsdaten aus .env
db_config = {
    'host': os.getenv('MYSQL_HOST'),
    'user': os.getenv('MYSQL_USER'),
    'password': os.getenv('MYSQL_PASSWORD')
}

def setup_database():
    try:
        # Erstelle Verbindung
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor()

        # Erstelle Datenbank
        cursor.execute("CREATE DATABASE IF NOT EXISTS chat_app")
        cursor.execute("USE chat_app")

        # Erstelle users Tabelle
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(50) NOT NULL UNIQUE,
                email VARCHAR(100) NOT NULL UNIQUE,
                password_hash VARCHAR(255) NOT NULL,
                last_seen DATETIME,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Drop existing messages table if exists
        cursor.execute("DROP TABLE IF EXISTS messages")

        # Erstelle messages Tabelle neu
        cursor.execute("""
            CREATE TABLE messages (
                id INT AUTO_INCREMENT PRIMARY KEY,
                sender_id INT NOT NULL,
                receiver_id INT NOT NULL,
                content TEXT NOT NULL,
                message_type ENUM('text', 'photo', 'voice') DEFAULT 'text',
                file_path VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                is_read BOOLEAN DEFAULT FALSE,
                FOREIGN KEY (sender_id) REFERENCES users(id),
                FOREIGN KEY (receiver_id) REFERENCES users(id)
            )
        """)

        # Commit die Änderungen
        conn.commit()
        print("Datenbank und Tabellen wurden erfolgreich erstellt!")

    except mysql.connector.Error as err:
        print(f"Fehler: {err}")

    finally:
        if 'conn' in locals() and conn.is_connected():
            cursor.close()
            conn.close()
            print("Datenbankverbindung wurde geschlossen.")

if __name__ == "__main__":
    setup_database() 