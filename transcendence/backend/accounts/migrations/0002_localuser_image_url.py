from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('accounts', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='localuser',
            name='image_url',
            field=models.URLField(blank=True, default=''),
        ),
    ]
