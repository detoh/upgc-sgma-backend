# ========================================
# Étape 1 : Build
# ========================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copier package.json et package-lock.json
COPY package*.json ./

# Installer toutes les dépendances (y compris devDependencies)
RUN npm ci

# Copier le reste du code source
COPY . .

# Générer le client Prisma
RUN npx prisma generate

# Compiler TypeScript
RUN npm run build

# ========================================
# Étape 2 : Production
# ========================================
FROM node:20-alpine AS runner

WORKDIR /app

# Définir NODE_ENV pour n'installer que les dépendances de production
ENV NODE_ENV=production

# Copier package.json et package-lock.json
COPY package*.json ./

# Installer uniquement les dépendances de production
RUN npm ci --only=production

# Copier le client Prisma généré
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copier les fichiers compilés depuis l'étape builder
COPY --from=builder /app/dist ./dist

# Copier le schéma Prisma (nécessaire pour les migrations)
COPY --from=builder /app/prisma ./prisma

# Exposer le port
EXPOSE 3000

# Commande de démarrage
CMD ["node", "dist/main.js"]
