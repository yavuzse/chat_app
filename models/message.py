from datetime import datetime
import mysql.connector
from dotenv import load_dotenv
import os

load_dotenv()

db_config = {
    'host': os.getenv('MYSQL_HOST'),
    'user': os.getenv('MYSQL_USER'),
    'password': os.getenv('MYSQL_PASSWORD'),
    'database': 'chat_app'
}

class Message:
    def __init__(self, id, sender_id, receiver_id, content, message_type, file_path, created_at, is_read):
        self.id = id
        self.sender_id = sender_id
        self.receiver_id = receiver_id
        self.content = content
        self.message_type = message_type
        self.file_path = file_path
        self.created_at = created_at
        self.is_read = is_read

    @staticmethod
    def create(sender_id, receiver_id, content, message_type='text', file_path=None):
        try:
            conn = mysql.connector.connect(**db_config)
            cursor = conn.cursor(dictionary=True)
            
            cursor.execute("""
                INSERT INTO messages 
                (sender_id, receiver_id, content, message_type, file_path) 
                VALUES (%s, %s, %s, %s, %s)
            """, (sender_id, receiver_id, content, message_type, file_path))
            
            conn.commit()
            message_id = cursor.lastrowid
            
            # Hole die neu erstellte Nachricht
            cursor.execute("""
                SELECT m.*, 
                       s.username as sender_username,
                       r.username as receiver_username
                FROM messages m
                JOIN users s ON m.sender_id = s.id
                JOIN users r ON m.receiver_id = r.id
                WHERE m.id = %s
            """, (message_id,))
            
            return cursor.fetchone()
            
        except mysql.connector.Error as err:
            print(f"Datenbankfehler: {err}")
            return None
        finally:
            if 'conn' in locals() and conn.is_connected():
                cursor.close()
                conn.close()

    @staticmethod
    def get_chat_messages(user1_id, user2_id, limit=50):
        try:
            conn = mysql.connector.connect(**db_config)
            cursor = conn.cursor(dictionary=True)
            
            cursor.execute("""
                SELECT m.*, 
                       s.username as sender_username,
                       r.username as receiver_username
                FROM messages m
                JOIN users s ON m.sender_id = s.id
                JOIN users r ON m.receiver_id = r.id
                WHERE (m.sender_id = %s AND m.receiver_id = %s)
                   OR (m.sender_id = %s AND m.receiver_id = %s)
                ORDER BY m.created_at ASC
                LIMIT %s
            """, (user1_id, user2_id, user2_id, user1_id, limit))
            
            return cursor.fetchall()
            
        except mysql.connector.Error as err:
            print(f"Datenbankfehler: {err}")
            return []
        finally:
            if 'conn' in locals() and conn.is_connected():
                cursor.close()
                conn.close()

    def mark_as_read(self):
        try:
            conn = mysql.connector.connect(**db_config)
            cursor = conn.cursor()
            
            cursor.execute("""
                UPDATE messages 
                SET is_read = TRUE 
                WHERE id = %s
            """, (self.id,))
            
            conn.commit()
            self.is_read = True
            
        except mysql.connector.Error as err:
            print(f"Datenbankfehler: {err}")
        finally:
            if 'conn' in locals() and conn.is_connected():
                cursor.close()
                conn.close()

    @staticmethod
    def mark_as_read(message_id, receiver_id):
        try:
            conn = mysql.connector.connect(**db_config)
            cursor = conn.cursor()
            
            cursor.execute("""
                UPDATE messages 
                SET is_read = 1 
                WHERE id = %s AND receiver_id = %s
            """, (message_id, receiver_id))
            
            conn.commit()
            return cursor.rowcount > 0
            
        except mysql.connector.Error as err:
            print(f"Datenbankfehler: {err}")
            return False
        finally:
            if 'conn' in locals() and conn.is_connected():
                cursor.close()
                conn.close()

    def to_dict(self):
        return {
            'id': self.id,
            'sender_id': self.sender_id,
            'receiver_id': self.receiver_id,
            'content': self.content,
            'message_type': self.message_type,
            'file_path': self.file_path,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S'),
            'is_read': self.is_read
        }

    @classmethod
    def delete(cls, message_id):
        """Löscht eine Nachricht anhand ihrer ID."""
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor()
        cursor.execute('DELETE FROM messages WHERE id = %s', (message_id,))
        conn.commit()
        cursor.close()
        conn.close()

    @classmethod
    def get_by_id(cls, message_id):
        """Holt eine Nachricht anhand ihrer ID."""
        try:
            conn = mysql.connector.connect(**db_config)
            cursor = conn.cursor(dictionary=True)
            
            cursor.execute("""
                SELECT * FROM messages WHERE id = %s
            """, (message_id,))
            
            message_data = cursor.fetchone()
            
            if not message_data:
                return None
            
            # Erstelle ein Message-Objekt
            message = cls(
                id=message_data['id'],
                sender_id=message_data['sender_id'],
                receiver_id=message_data['receiver_id'],
                content=message_data['content'],
                message_type=message_data['message_type'],
                file_path=message_data['file_path'],
                created_at=message_data['created_at'],
                is_read=message_data['is_read']
            )
            
            return message
            
        except mysql.connector.Error as err:
            print(f"Datenbankfehler: {err}")
            return None
        finally:
            if 'conn' in locals() and conn.is_connected():
                cursor.close()
                conn.close() 