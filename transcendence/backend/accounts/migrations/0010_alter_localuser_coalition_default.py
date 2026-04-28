# Coalition initiale vide pour les nouveaux comptes locaux (cérémonie choixpeau côté interface).

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0009_merge_20260424_2235'),
    ]

    operations = [
        migrations.AlterField(
            model_name='localuser',
            name='coalition',
            field=models.CharField(blank=True, default='', max_length=50),
        ),
    ]
