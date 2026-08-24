from dotenv import load_dotenv
from urllib.parse import quote_plus
import os

load_dotenv()

SECRET_KEY     = os.getenv("SECRET_KEY")
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")

# Build a safe DATABASE_URL — quote_plus handles @ and other special chars in the password
_url = os.getenv("DATABASE_URL")
if not _url:
    _user = os.getenv("DB_USERNAME", "root")
    _pass = quote_plus(os.getenv("DB_PASSWORD", ""))   # safely encodes sql@0000 → sql%400000
    _host = os.getenv("DB_HOST", "localhost")
    _port = os.getenv("DB_PORT", "3306")
    _name = os.getenv("DB_NAME", "namma_gig")
    _url  = f"mysql+pymysql://{_user}:{_pass}@{_host}:{_port}/{_name}"

DATABASE_URL = _url