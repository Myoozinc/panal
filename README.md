# 🐝 Panal — Plataforma Global de Sinergia y Match para Creadores

**Panal** es una plataforma donde creadores de contenido, streamers, marcas, desarrolladores y talentos de cualquier disciplina hacen match para colaborar, compartir audiencias y co-crear marcas de alto impacto.

En lugar de una fotografía estética tradicional, cada tarjeta de match es un **Social Bento Recap**: un panel interactivo que resume presencia en Instagram, TikTok, YouTube, X, Twitch y métricas clave de alcance y sinergia.

---

## ⚡ Características Principales

1. **Social Bento Match Card**:
   - Widgets embebidos con métricas en tiempo real de Instagram, TikTok, YouTube, X y Twitch.
   - Indicador de Alcance Total (`+250K`, `+1M`, etc.).
   - Switch interactivo para alternar entre vista Bento y fotografía visual.
2. **Matriz de Colaboración**:
   - Qué aporta cada creador (Audiencia viral, Producción 4K, Código/App, Branding, etc.).
   - Qué busca co-crear (Campaña cruzada, Co-branding, Patrocinio, Podcast).
3. **Multi-Dominio**:
   - Abierto a todos los sectores: Tech Founders, Creadores de Contenido, Fitness & Salud, Moda, Gaming, Gastronomía, Marketing y Marcas.
4. **Acuerdos de Sinergia y Exportación en PDF**:
   - Estructuración rápida de entregables, fechas y modelos económicos (Rev-share, Split 50/50, Cross-Value).
   - Generación formal de contrato en PDF con firma digital inmediata.
   - Generador asistido con IA (Gemini).
5. **Arquitectura Flexible**:
   - Compatible con **Firebase / Cloud Firestore** para backend ágil y sin migraciones SQL complejas.
   - Catálogo integrado de creadores de demostración (`DEMO_CREATORS`) para probar la app inmediatamente sin configurar bases de datos.

---

## 🚀 Puesta en marcha local

### Requisitos
- Node.js v18+ y npm

### Instalación
```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables (opcional para desarrollo local con creadores demo)
cp .env.example .env

# 3. Iniciar servidor de desarrollo
npm run dev
```

---

## ☁️ Despliegue en Vercel

El proyecto incluye configuración de rutas SPA en `vercel.json`.

Para desplegar:
1. Sube este repositorio a tu cuenta de GitHub (`git push`).
2. Entra en [vercel.com](https://vercel.com) y selecciona **Add New > Project**.
3. Importa el repositorio `panal`.
4. El framework se detectará automáticamente como **Vite**.
5. Haz clic en **Deploy**.

---

## 📄 Licencia y Créditos
Desarrollado para el ecosistema **Panal**.
