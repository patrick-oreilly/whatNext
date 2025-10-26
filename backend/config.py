import os
import logging

class Settings:
    def __init__(self):
        self.google_api_key = os.getenv('GOOGLE_API_KEY')
        self.google_api_secret = os.getenv('GOOGLE_API_SECRET')
        self.google_api_project_id = os.getenv('GOOGLE_API_PROJECT_ID')
        self.google_api_project_name = os.getenv('GOOGLE_API_PROJECT_NAME')
        self.google_api_project_description = os.getenv('GOOGLE_API_PROJECT_DESCRIPTION')
        self.google_api_project_version = os.getenv('GOOGLE_API_PROJECT_VERSION')


def setup_logging():
    logging.basicConfig(level=logging.INFO)
    LOG_DIRECTORY = os.path.join(os.path.dirname(__file__), 'logs')
    if not os.path.exists(LOG_DIRECTORY):
        os.makedirs(LOG_DIRECTORY)