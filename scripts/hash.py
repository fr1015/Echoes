from werkzeug.security import generate_password_hash

password = input("Password: ")
hashed_password = generate_password_hash(password)
print("Hashed Password:", hashed_password)