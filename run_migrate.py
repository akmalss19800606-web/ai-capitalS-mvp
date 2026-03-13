import sys
sys.path.insert(0, '/usr/local/lib/python3.11/site-packages')
from alembic.config import Config
from alembic import command
config = Config('/app/alembic.ini')
config.set_main_option('script_location', '/app/alembic')
command.upgrade(config, 'heads')
