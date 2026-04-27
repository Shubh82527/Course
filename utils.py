import json


def read_data():
    try:
        with open('course.json', 'r') as fs:
            return json.load(fs)
    except FileNotFoundError:
        return []


def write_data(data):
    with open('course.json', 'w') as fs:
        json.dump(data, fs, indent=4)