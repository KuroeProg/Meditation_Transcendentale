from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('accounts', '0002_localuser_image_url'),
    ]

    operations = [
        migrations.AddField(
            model_name='localuser',
            name='is_2fa_verified',
            field=models.BooleanField(default=True),
        ),
    ]
