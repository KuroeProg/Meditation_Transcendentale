from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0006_friendship_blocked_by'),
    ]

    operations = [
        migrations.AddField(
            model_name='localuser',
            name='client_prefs',
            field=models.JSONField(
                blank=True,
                null=True,
                default=None,
                help_text='Persistent UI/audio preferences synced from the client.',
            ),
        ),
    ]
