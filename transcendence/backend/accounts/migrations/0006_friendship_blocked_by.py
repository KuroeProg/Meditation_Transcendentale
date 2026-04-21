from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0005_localuser_avatar_localuser_bio_localuser_elo_blitz_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='friendship',
            name='blocked_by',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='friendships_blocked',
                to='accounts.localuser',
            ),
        ),
    ]