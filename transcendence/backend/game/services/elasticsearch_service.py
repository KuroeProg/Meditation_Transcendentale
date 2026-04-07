import os
from elasticsearch import Elasticsearch

ES_PASSWORD = os.getenv('ELASTIC_PASSWORD', 'pwElastic')

es = Elasticsearch(
    "https://elasticsearch:9200",
    basic_auth=("elastic", ES_PASSWORD),
    verify_certs=False
)

def index_game_result(game_data):
    """
    Envoie les statistiques d'une partie terminée vers Elasticsearch.
    C'est le côté 'Query' de notre architecture CQRS.
    """
    try:
        # On crée un document "propre" pour l'analyse
        doc = {
            "player_white_id": game_data.get('player_white_id'),
            "player_black_id": game_data.get('player_black_id'),
            "winner_id": game_data.get('winner_id'),
            "duration_seconds": game_data.get('duration_seconds'),
            "timestamp": game_data.get('start_timestamp'),
            "total_moves": len(game_data.get('moves', [])),
            "moves": game_data.get('moves', [])
        }
        
        # On indexe dans 'chess-games'
        response = es.index(index="chess-games", document=doc)
        print(f"Propagé vers Elasticsearch : {response['result']}")
        return True
    except Exception as e:
        print(f"Erreur d'indexation Elasticsearch : {e}")
        return False
