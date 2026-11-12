FROM node:20-alpine

WORKDIR /app

# Cache buster
ARG CACHE_BUST=2026
RUN echo "Build timestamp: $CACHE_BUST"

# Copier package.json et package-lock.json
COPY package*.json ./

# Installer toutes les dépendances
RUN npm install

# Copier le reste du code source
COPY . .

# Générer le client Prisma
RUN npx prisma generate

# Compiler TypeScript
RUN npm run build

# Vérifier que le fichier existe (debug)
RUN ls -la dist/src/main.js || echo "main.js not found"

# Exposer le port
EXPOSE 3000

# Commande de démarrage - CORRIGÉ : dist/src/main.js au lieu de dist/main.js
CMD ["node", "dist/src/main.js"]