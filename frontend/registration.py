import os
import json

base_path = r"C:\Users\Dell\OneDrive\Desktop\Student_OS\backend\data (3)\data\24"

emails = []

for root, dirs, files in os.walk(base_path):

    for file in files:

        if file.endswith(".json"):

            path = os.path.join(root, file)

            with open(path, "r", encoding="utf-8") as f:

                data = json.load(f)

                name = data["student_information"]["name"]

                # convert name to email format
                email_name = ".".join(name.lower().split())

                email = f"{email_name}2024@vitstudent.ac.in"

                emails.append(email)

                print(email)

# save emails
with open("emails.txt", "w") as f:
    for e in emails:
        f.write(e + "\n")

print("\nTotal emails generated:", len(emails))