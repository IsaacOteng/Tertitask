from django.apps import AppConfig


class AccountsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'accounts'

    def ready(self):
        # Called once by Django after all apps are loaded, in the actual
        # serving process — the right place to initialise Firebase Admin SDK.
        from accounts.authentication import _init_firebase
        _init_firebase()
