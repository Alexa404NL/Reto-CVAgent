# Agente de CV — Alexa Lara 

Agente conversacional que responde sobre la trayectoria profesional de Alexa usando RAG por medio de Postgres/pgvector y Gemma vía Gemini API. 

## Estructura

```
Cliente
   │  POST /v1/responses   Authorization: Bearer <token>
   ▼
Respuesta (JSON) o stream 
```

- Ocupa un cv en formato md con encabezados `##`/`###`, para poder generar los embeddings. NOTA: debe ser el mismo modelo / dimension el que hace el retrival que el que hace el chunking. Esto, se hace local con ingest.js


## Correr localmente
```
npm install
npm start 
npm run ingest             # embeddings de cv.md en Postgres
```

## Límites conocidos

- Aiven para bd y Render se duermen por inactividad
- El contador de tope diario vive en memoria del proceso, se reinicia si Render reinicia la instancia y no se comparte entre instancias 
