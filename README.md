# Proyecto Prepaga Digital

> Sistema digital para gestión de usuarios, afiliados y servicios de prepagas médicas. Backend en Node.js + Express, base de datos en Supabase.

![Node.js](https://img.shields.io/badge/Node.js-18+-green)
![Express](https://img.shields.io/badge/Express.js-4.x-blue)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-FBCA2B)
![License](https://img.shields.io/badge/License-MIT-purple)

### 🎯 Descripción
Este sistema permite gestionar usuarios, autenticación, afiliados y servicios médicos en una prepaga digital. Está construido con buenas prácticas de arquitectura, seguridad y escalabilidad.

---

## 🚀 Funcionalidades

- ✅ Registro e inicio de sesión seguro (JWT + bcrypt)
- ✅ Conexión con Supabase como base de datos
- ✅ API RESTful bien estructurada (MVC)
- ✅ Validación de datos
- ✅ Variables de entorno
- ✅ Logging básico
- ✅ Listo para contenerizar con Docker

---

## 🛠️ Tecnologías

- **Backend**: Node.js + Express
- **Base de datos**: [Supabase](https://supabase.com) (PostgreSQL)
- **Autenticación**: JWT
- **Seguridad**: bcrypt, CORS, body-parser
- **Logging**: console (extensible a Winston)
- **Desarrollo**: Nodemon, ESLint (opcional)

---

## 📦 Instalación

### 1. Clonar el repositorio
```bash
git clone https://github.com/DaltonP93/prepaga-digital.git
cd prepaga-digital
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Crear archivo `.env`
Crea un archivo `.env` en la raíz del proyecto:

```env
PORT=3000
NODE_ENV=development

# Supabase
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_KEY=tu_clave_anonima_o_service_role

# JWT
JWT_SECRET=clave-secreta-muy-segura-cambia-esto-en-produccion

# CORS (opcional)
CORS_ORIGIN=http://localhost:5173
```

### 4. Ejecutar en desarrollo
```bash
npm run dev
```

El servidor correrá en `http://localhost:3000`

---

## 🗂️ Estructura del proyecto

```
prepaga-digital/
├── src/
│   ├── controllers/
│   ├── routes/
│   ├── services/
│   ├── utils/
│   └── app.js
├── .env
├── .gitignore
├── package.json
├── README.md
└── server.js
```

---

## 🔐 Endpoints de API

| Método | Ruta               | Descripción                     |
|--------|--------------------|---------------------------------|
| POST   | `/api/auth/register` | Registrar nuevo usuario         |
| POST   | `/api/auth/login`    | Iniciar sesión                  |
| GET    | `/api/users`         | Listar usuarios (protegido)     |

> Todos los endpoints `/api/*` requieren JWT para acceso protegido.

---

## 🐳 Docker (opcional)

Crea un `Dockerfile`:

```Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "run", "start"]
```

Construir:
```bash
docker build -t prepaga-digital .
docker run -p 3000:3000 --env-file .env prepaga-digital
```

---

## 🌐 Despliegue recomendado

- **Backend**: Railway, Render, o AWS
- **Frontend**: Vercel, Netlify
- **Base de datos**: Supabase (ya configurado)

---

## 📝 Licencia

MIT © [DaltonP93](https://github.com/DaltonP93)
```

---

## 📁 2. Estructura de carpetas recomendada

Crea esta estructura dentro de `src/`:

```
src/
├── controllers/
│   └── authController.js
│   └── userController.js
├── routes/
│   └── authRoutes.js
│   └── userRoutes.js
├── services/
│   └── authService.js
│   └── userService.js
├── utils/
│   └── db.js          (cliente Supabase)
│   └── authMiddleware.js (proteger rutas)
│   └── logger.js      (opcional)
├── app.js             (configuración Express)
└── server.js          (punto de entrada)
```

---

## 🎉 ¡Listo!
