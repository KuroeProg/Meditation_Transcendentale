from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0010_alter_localuser_coalition_default'),
    ]

    operations = [
        migrations.AddField(
            model_name='localuser',
            name='achievements',
            field=models.JSONField(blank=True, default=list, help_text='Unlocked achievement IDs.'),
        ),
    ]
