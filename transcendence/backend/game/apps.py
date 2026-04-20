import logging
import os
from django.apps import AppConfig
from elasticsearch import Elasticsearch

logger = logging.getLogger(__name__)

class ChessAppConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'game'

    def ready(self):
        """
        This runs exactly once when the Django server boots.
        It checks Elasticsearch and auto-heals the infrastructure if missing.
        """
        # Note: We put this in a try/except so if Elasticsearch is down, 
        # Django still boots up safely to serve other web pages.
        try:
            es_password = os.environ.get('ELASTIC_PASSWORD', 'fallback_password')

            es = Elasticsearch(
                "https://elasticsearch:9200", 
                verify_certs=False,     
                basic_auth=("elastic", es_password)
            )
            
            mapping_body = {
                "mappings": {
                    "properties": {
                        "moves": {
                            "type": "nested" 
                        }
                    }
                }
            }

            # The Safe Check: If it doesn't exist, create it with the perfect format!
            if not es.indices.exists(index="chess-games"):
                es.indices.create(index="chess-games", body=mapping_body)
                logger.info("BOOT UP: Auto-created 'chess-games' index with nested mapping.")
            else:
                logger.info("BOOT UP: 'chess-games' index already exists. All good.")
                
        except Exception as e:
            logger.warning(f"BOOT UP: Could not connect to Elasticsearch. Analytics offline. Error: {e}")