from django.core.management.base import BaseCommand
from game.models import Game
from game.services.elasticsearch_service import index_game_instance, es
import sys

class Command(BaseCommand):
    help = "Vérifie l'intégrité de l'index Elasticsearch 'chess-games' par rapport à PostgreSQL et répare les manques."

    def add_arguments(self, parser):
        parser.add_argument(
            '--cleanup',
            action='store_true',
            help='Supprime les documents dans ES qui n\'existent plus dans Postgres (uniquement pour chess-games)',
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS("=== Début de la vérification d'intégrité Elasticsearch ==="))

        # 1. Synchronisation de Postgres vers ES
        # On utilise prefetch_related pour éviter le problème N+1
        games = Game.objects.all().prefetch_related('moves', 'player_white', 'player_black', 'winner')
        total = games.count()
        self.stdout.write(f"Nombre de parties trouvées dans PostgreSQL : {total}")

        postgres_ids = set()
        success_count = 0
        
        for game in games:
            postgres_ids.add(str(game.id))
            # index_game_instance utilise l'ID de la partie comme ID de document, donc c'est idempotent (écrase si existe)
            if index_game_instance(game):
                success_count += 1
            
            if success_count % 10 == 0 and success_count > 0:
                self.stdout.write(f"Synchronisation en cours... ({success_count}/{total})")

        self.stdout.write(self.style.SUCCESS(f"Synchronisation terminée : {success_count}/{total} parties traitées."))

        # 2. Nettoyage des orphelins dans ES (Uniquement pour l'index chess-games)
        if options['cleanup']:
            self.stdout.write(self.style.WARNING("Recherche de documents orphelins dans Elasticsearch (chess-games uniquement)..."))
            try:
                # On récupère tous les IDs présents dans l'index chess-games
                # Note: On utilise scan/scroll si il y a beaucoup de données
                query = {"query": {"match_all": {}}, "_source": False}
                
                # On utilise l'API search simple pour cet index qui ne devrait pas être gigantesque
                # Si l'index dépasse 10000 docs, il faudra passer par le scroll.
                res = es.search(index="chess-games", body=query, size=10000)
                hits = res.get('hits', {}).get('hits', [])
                
                es_ids = [hit['_id'] for hit in hits]
                orphans = [eid for eid in es_ids if eid not in postgres_ids]

                if orphans:
                    self.stdout.write(f"Trouvé {len(orphans)} documents orphelins. Suppression...")
                    for oid in orphans:
                        es.delete(index="chess-games", id=oid)
                    self.stdout.write(self.style.SUCCESS(f"Suppression terminée ({len(orphans)} documents supprimés)."))
                else:
                    self.stdout.write(self.style.SUCCESS("Aucun document orphelin détecté dans 'chess-games'."))

            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Erreur lors du nettoyage des orphelins : {e}"))

        self.stdout.write(self.style.SUCCESS("=== Vérification d'intégrité terminée ==="))
