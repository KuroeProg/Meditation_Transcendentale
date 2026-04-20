from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('game', '0003_game_increment_game_time_control'),
    ]

    operations = [
        migrations.AddField(
            model_name='game',
            name='game_mode',
            field=models.CharField(default='standard', max_length=32),
        ),
        migrations.AddField(
            model_name='game',
            name='increment_seconds',
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name='game',
            name='is_competitive',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='game',
            name='is_rated',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='game',
            name='termination_reason',
            field=models.CharField(blank=True, default='', max_length=32),
        ),
        migrations.AddField(
            model_name='game',
            name='time_category',
            field=models.CharField(default='rapid', max_length=32),
        ),
        migrations.AddField(
            model_name='game',
            name='time_control_seconds',
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
    ]
