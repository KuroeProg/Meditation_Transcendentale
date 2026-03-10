FROM python:3.11-slim

# ne pas afficher de .pyc, et afficher les logs
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

WORKDIR /app

RUN apt-get update && apt-get install -y libpq-dev gcc && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# script de lancer pour gerer les migrations
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]