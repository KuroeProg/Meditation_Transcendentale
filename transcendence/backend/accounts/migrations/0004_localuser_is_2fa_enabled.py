from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('accounts', '0003_localuser_is_2fa_verified'),
    ]

    operations = [
        migrations.AddField(
            model_name='localuser',
            name='is_2fa_enabled',
            field=models.BooleanField(default=True),
        ),
    ]
