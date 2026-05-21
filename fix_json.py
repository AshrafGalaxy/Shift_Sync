import re
with open('frontend/app/dashboard/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r'const \[jsonPayload, setJsonPayload\] = useState\(JSON\.stringify\(\{.*?\}, null, 4\)\);'
replacement = '''const [jsonPayload, setJsonPayload] = useState(JSON.stringify({
  "college_settings": {
    "days_active": ["Mon", "Tue", "Wed", "Thu", "Fri"],
    "time_slots": [8, 9, 10, 11, 12, 13, 14, 15, 16],
    "lunch_slot": {"Mon": 13, "Tue": 13, "Wed": 13, "Thu": 13, "Fri": 13},
    "max_continuous_lectures": 3,
    "custom_rules": []
  },
  "rooms_config": {
    "rooms": [
      {"id": "D201", "type": "theory", "capacity": 80, "tags": []},
      {"id": "D205", "type": "theory", "capacity": 80, "tags": []},
      {"id": "D207", "type": "theory", "capacity": 80, "tags": []},
      {"id": "Lab1", "type": "practical", "capacity": 40, "tags": ["Computer_Lab"]},
      {"id": "Lab2", "type": "practical", "capacity": 40, "tags": ["Computer_Lab"]}
    ]
  },
  "faculty": [
    {
      "id": "F001", "name": "Dr. Smith", "shift": [8, 9, 10, 11, 12, 13, 14, 15, 16], "max_load_hrs": 12, "max_continuous_hrs": 3, "blocked_slots": [], "class_teacher_for": "SY-A",
      "workload": [
        {"id": "W1", "type": "Theory", "subject": "Math", "target_groups": ["SY-A"], "hours": 4, "consecutive_hours": 1, "required_tags": [], "is_online": false},
        {"id": "W2", "type": "Theory", "subject": "Math", "target_groups": ["SY-B"], "hours": 4, "consecutive_hours": 1, "required_tags": [], "is_online": false}
      ]
    },
    {
      "id": "F002", "name": "Prof. Jones", "shift": [8, 9, 10, 11, 12, 13, 14, 15, 16], "max_load_hrs": 17, "max_continuous_hrs": 3, "blocked_slots": [], "class_teacher_for": "SY-B",
      "workload": [
        {"id": "W3", "type": "Theory", "subject": "Physics", "target_groups": ["SY-A"], "hours": 3, "consecutive_hours": 1, "required_tags": [], "is_online": false},
        {"id": "W4", "type": "Theory", "subject": "Physics", "target_groups": ["SY-B"], "hours": 3, "consecutive_hours": 1, "required_tags": [], "is_online": false}
      ]
    },
    {
      "id": "F003", "name": "Dr. Davis", "shift": [8, 9, 10, 11, 12, 13, 14, 15, 16], "max_load_hrs": 14, "max_continuous_hrs": 3, "blocked_slots": [], "class_teacher_for": "",
      "workload": [
        {"id": "W5", "type": "Practical", "subject": "CS Lab", "target_groups": ["SY-A"], "hours": 4, "consecutive_hours": 2, "required_tags": ["Computer_Lab"], "is_online": false},
        {"id": "W6", "type": "Practical", "subject": "CS Lab", "target_groups": ["SY-B"], "hours": 4, "consecutive_hours": 2, "required_tags": ["Computer_Lab"], "is_online": false}
      ]
    }
  ]
}, null, 2));'''

new_content = re.sub(pattern, replacement, content, flags=re.DOTALL)
with open('frontend/app/dashboard/page.tsx', 'w', encoding='utf-8') as f:
    f.write(new_content)
print('Replaced')
