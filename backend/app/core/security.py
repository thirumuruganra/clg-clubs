from authlib.integrations.starlette_client import OAuth
from starlette.config import Config

# Assuming .env is loaded
config = Config('.env')

oauth = OAuth(config)
oauth.register(
    name='google',
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={
        'scope': 'openid email profile https://www.googleapis.com/auth/calendar.events',
    }
)
