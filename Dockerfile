FROM node:20-alpine

WORKDIR /app

# Cache buster - cette ligne force l'invalidation du cache
ARG CACHE_BUST=1
RUN echo "Cache bust: $CACHE_BUST"

# Copier package.json et package-lock.json
COPY package*.json ./

# Installer toutes les dépendances
RUN npm install

# Copier le reste du code source
COPY . .

# Générer le client Prisma
RUN npx prisma generate

# Afficher la structure avant le build (debug)
RUN echo "=== Structure avant build ===" && ls -la src/ || echo "src not found"

# Compiler TypeScript avec affichage détaillé
RUN npm run build 2>&1 || (echo "=== BUILD FAILED ===" && exit 1)

# Afficher la structure après le build (debug)
RUN echo "=== Structure après build ===" && ls -la && ls -la dist/ || echo "dist folder not found"

# Vérifier spécifiquement main.js
RUN if [ -f dist/main.js ]; then echo "✅ dist/main.js exists"; else echo "❌ dist/main.js NOT FOUND" && find . -name "main.js" -type f; fi

# Exposer le port
EXPOSE 3000

# Commande de démarrage
CMD ["node", "dist/main.js"]