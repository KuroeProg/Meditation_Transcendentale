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
            from django.conf import settings
            es_password = settings.ELASTIC_PASSWORD

            es = Elasticsearch(
                "https://elasticsearch:9200", 
                ca_certs="/etc/certs_elastic/elasticsearch.crt",
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
            if "resource_already_exists_exception" in str(e):
                logger.info("BOOT UP: 'chess-games' index creation hit a race condition, but it exists safely. All good.")
            else:
                logger.warning(f"BOOT UP: Could not connect to Elasticsearch. Analytics offline. Error: {e}")