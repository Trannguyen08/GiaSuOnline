from .base import *
import dj_database_url
from decouple import config

DEBUG = True

DATABASES = {
    'default': dj_database_url.config(default=config('DATABASE_URL'))
}

INSTALLED_APPS += ['debug_toolbar']
MIDDLEWARE += ['debug_toolbar.middleware.DebugToolbarMiddleware']
INTERNAL_IPS = ['127.0.0.1']
