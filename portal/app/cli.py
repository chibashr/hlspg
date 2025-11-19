"""Flask CLI commands."""
import click
from flask.cli import with_appcontext
from .db import db
from .models import Role, User
from .utils.bootstrap import bootstrap_app
from .utils.security import hash_password


@click.command()
@with_appcontext
def init_db():
    """Initialize the database."""
    db.create_all()
    bootstrap_app(db)
    click.echo('Database initialized.')


@click.command()
@with_appcontext
def create_admin():
    """Create an admin user."""
    username = click.prompt('Username', default='admin')
    password = click.prompt('Password', hide_input=True)
    email = click.prompt('Email', default='')
    
    user = User.query.filter_by(uid=username).first()
    if user:
        click.echo(f'User {username} already exists.')
        return
    
    hashed_pw = hash_password(password)
    user = User(
        uid=username,
        display_name=username,
        email=email,
        is_local_admin=True,
        disabled=False,
        cached_groups=[]
    )
    
    db.session.add(user)
    db.session.commit()
    click.echo(f'Admin user {username} created.')


def register_commands(app):
    """Register CLI commands."""
    app.cli.add_command(init_db)
    app.cli.add_command(create_admin)

