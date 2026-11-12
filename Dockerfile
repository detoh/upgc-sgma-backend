FROM node:20-bookworm-slim

WORKDIR /app

# Installation d'OpenSSL (requis par Prisma)
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Copier les fichiers de dépendances et le schéma Prisma
COPY package*.json ./
COPY prisma ./prisma/

# Installer les dépendances
RUN npm install

# Copier le reste du code source
COPY . .

# Générer le client Prisma
RUN npx prisma generate

# Compiler TypeScript
RUN npm run build

# Exposer le port
EXPOSE 8080

# Commande de démarrage : synchroniser la base puis démarrer l'app
CMD ["sh", "-c", "npx prisma db push --skip-generate && node dist/src/main.js"]