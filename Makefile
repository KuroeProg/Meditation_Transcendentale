NAME = transcendence

all: build

build:
	cd transcendence && docker compose build

up:
	cd transcendence && docker compose up

down:
	cd transcendence && docker compose down

clean:
	cd transcendence && docker compose down

fclean: clean
	cd transcendence && docker compose down --rmi all

re: fclean all

.PHONY: all build up down clean fclean re
