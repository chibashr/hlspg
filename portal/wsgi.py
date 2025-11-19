"""WSGI entry point."""
import os
from app import create_app

app = create_app()

if __name__ == '__main__':
    port = int(os.getenv('APP_PORT', 3000))
    host = os.getenv('APP_HOST', '0.0.0.0')
    app.run(host=host, port=port, debug=os.getenv('FLASK_ENV') == 'development')

