from flask_login import UserMixin
import mysql.connector
from dotenv import load_dotenv
import os
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime

load_dotenv()

db_config = {
    'host': os.getenv('MYSQL_HOST'),
    'user': os.getenv('MYSQL_USER'),
    'password': os.getenv('MYSQL_PASSWORD'),
    'database': 'chat_app'
}

class User(UserMixin):
    def __init__(self, id, username, email, password_hash):
        self.id = id
        self.username = username
        self.email = email
        self.password_hash = password_hash

    @staticmethod
    def get_by_id(user_id):
        try:
            conn = mysql.connector.connect(**db_config)
            cursor = conn.cursor(dictionary=True)
            cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))
            user_data = cursor.fetchone()
            
            if user_data:
                return User(
                    id=user_data['id'],
                    username=user_data['username'],
                    email=user_data['email'],
                    password_hash=user_data['password_hash']
                )
            return None
            
        except mysql.connector.Error as err:
            print(f"Datenbankfehler: {err}")
            return None
        finally:
            if 'conn' in locals() and conn.is_connected():
                cursor.close()
                conn.close()

    @staticmethod
    def authenticate(email, password):
        try:
            conn = mysql.connector.connect(**db_config)
            cursor = conn.cursor(dictionary=True)
            cursor.execute("SELECT * FROM users WHERE email = %s", (email,))
            user_data = cursor.fetchone()
            
            if user_data and check_password_hash(user_data['password_hash'], password):
                return User(
                    id=user_data['id'],
                    username=user_data['username'],
                    email=user_data['email'],
                    password_hash=user_data['password_hash']
                )
            return None
            
        except mysql.connector.Error as err:
            print(f"Datenbankfehler: {err}")
            return None
        finally:
            if 'conn' in locals() and conn.is_connected():
                cursor.close()
                conn.close()

    @staticmethod
    def create(username, email, password):
        try:
            conn = mysql.connector.connect(**db_config)
            cursor = conn.cursor()
            
            password_hash = generate_password_hash(password)
            cursor.execute(
                "INSERT INTO users (username, email, password_hash) VALUES (%s, %s, %s)",
                (username, email, password_hash)
            )
            
            conn.commit()
            return True
            
        except mysql.connector.Error as err:
            print(f"Datenbankfehler: {err}")
            return False
        finally:
            if 'conn' in locals() and conn.is_connected():
                cursor.close()
                conn.close()

    def get_id(self):
        return str(self.id)

    def update_last_seen(self):
        try:
            conn = mysql.connector.connect(**db_config)
            cursor = conn.cursor()
            
            cursor.execute(
                "UPDATE users SET last_seen = %s WHERE id = %s",
                (datetime.now(), self.id)
            )
            conn.commit()
            
        except mysql.connector.Error as err:
            print(f"Datenbankfehler: {err}")
        finally:
            if 'conn' in locals() and conn.is_connected():
                cursor.close()
                conn.close()

    @staticmethod
    def update_last_seen(user_id):
        try:
            conn = mysql.connector.connect(**db_config)
            cursor = conn.cursor()
            
            cursor.execute("""
                UPDATE users 
                SET last_seen = NOW() 
                WHERE id = %s
            """, (user_id,))
            
            conn.commit()
            
        except mysql.connector.Error as err:
            print(f"Datenbankfehler: {err}")
        finally:
            if 'conn' in locals() and conn.is_connected():
                cursor.close()
                conn.close()

    @staticmethod
    def get_all_users():
        try:
            conn = mysql.connector.connect(**db_config)
            cursor = conn.cursor(dictionary=True)
            cursor.execute("SELECT id, username, last_seen FROM users")
            return cursor.fetchall()
        except mysql.connector.Error as err:
            print(f"Datenbankfehler: {err}")
            return []
        finally:
            if 'conn' in locals() and conn.is_connected():
                cursor.close()
                conn.close()

    @staticmethod
    def update_username(user_id, new_username):
        try:
            conn = mysql.connector.connect(**db_config)
            cursor = conn.cursor()
            
            # Önce kullanıcı adının kullanılıp kullanılmadığını kontrol et
            cursor.execute("SELECT id FROM users WHERE username = %s AND id != %s", (new_username, user_id))
            if cursor.fetchone():
                return False
            
            cursor.execute("""
                UPDATE users 
                SET username = %s 
                WHERE id = %s
            """, (new_username, user_id))
            
            conn.commit()
            return True
            
        except mysql.connector.Error as err:
            print(f"Datenbankfehler: {err}")
            return False
        finally:
            if 'conn' in locals() and conn.is_connected():
                cursor.close()
                conn.close() 