# Proyecto Base — Parcial Práctico Backend (NestJS + MongoDB)

API REST en NestJS y Mongoose para la gestión de **Usuarios (`/users`)** y **Tareas (`/tasks`)**.

---

## Requisitos Previos

- **Node.js** 20+ y **npm**
- **Docker Desktop** (o instancia local de MongoDB en el puerto `27017`)

---

## Instalación y Puesta en Marcha

1. **Levantar la base de datos MongoDB:**
   ```bash
   docker compose up -d
   ```
   *(Si utilizas una instancia diferente a `mongodb://localhost:27017/nest-parcial`, configura la variable de entorno `MONGODB_URI` antes de iniciar la aplicación. El proyecto no carga el archivo `.env` automáticamente.)*

2. **Instalar dependencias del proyecto:**
   ```bash
   npm install
   ```

3. **Iniciar la aplicación en modo desarrollo:**
   ```bash
   npm run start:dev
   ```
   El servidor quedará disponible en `http://localhost:3000`.

---

## Pruebas y Validación

- **Ejecutar pruebas unitarias:**
  ```bash
  npm test
  ```
- **Ejecutar pruebas end-to-end:**
  ```bash
  npm run test:e2e
  ```
- **Verificar compilación y linter:**
  ```bash
  npm run build
  npm run lint
  ```

---

## Endpoints del Sistema

| Método | Ruta | Acceso | Descripción |
| :--- | :--- | :--- | :--- |
| `GET` | `/` | Público | Verificación básica del servidor |
| `POST` | `/users` | Público | Crear usuario (`name`, `email`) |
| `GET` | `/users` | Público | Listar usuarios registrados |
| `GET` | `/users/:id` | Público | Consultar usuario por ID |
| `GET` | `/tasks` | Público | Listar tareas registradas |
| `GET` | `/tasks/:id` | Público | Consultar tarea por ID |
| `POST` | `/tasks` | Restringido (`Authorization: admin-secret-token`) | Crear una tarea asociada a un usuario |

También puedes importar `nest-parcial.postman_collection.json` en Postman o utilizar `requests.http` con la extensión REST Client de VS Code para probar manualmente los endpoints.

---

## Evidencia de Funcionamiento

Se comprobó que el proyecto compila con `npm run build`. También pasaron las 8 pruebas unitarias y la prueba e2e. La prueba e2e necesita MongoDB y comprueba la ruta `/`.

Se hicieron pruebas con la aplicación y MongoDB en ejecución:

1. **Campos adicionales:** al enviar una tarea con `isAdmin`, `role` e `internalFlag`, la API respondió `400 Bad Request` y no se guardó la tarea. Una petición válida respondió `201 Created`; al revisar MongoDB, el documento no tenía esos campos adicionales. El esquema también está configurado con `strict: true`.
2. **Módulo de usuarios:** `TasksService` consulta a `UsersService` para verificar el usuario. Si no existe, responde `404 Not Found` y no guarda la tarea. El módulo de tareas ya no usa directamente el modelo de usuarios.
3. **Acceso a tareas:** `GET /tasks` y `GET /tasks/:id` respondieron `200 OK` sin autorización. `POST /tasks` sin el token respondió `403 Forbidden`. El guard se aplica solo al POST.
4. **Controlador de tareas:** el controlador depende únicamente de `TasksService`. Hay una prueba que lo crea con el servicio simulado y verifica que le delegue la creación.

Se usan tanto el DTO como el esquema estricto porque cumplen funciones distintas: el DTO rechaza los datos extra en la petición y el esquema ayuda a evitar que se guarden si llegan por otro camino. Separar la creación en el servicio también facilita probar el controlador sin conectarlo a la base de datos.

Para revisar las tareas guardadas en MongoDB se puede ejecutar:

```bash
docker compose exec mongodb mongosh nest-parcial --eval 'db.tasks.find().pretty()'
```

El token `admin-secret-token` es el solicitado para el ejercicio y no es una solución de autenticación para producción.
