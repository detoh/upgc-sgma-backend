FROM node:20-alpine

WORKDIR /app

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
RUN ls -la dist/ || echo "dist folder not found"

# Exposer le port
EXPOSE 3000

# Commande de démarrage
CMD ["node", "dist/main.js"]