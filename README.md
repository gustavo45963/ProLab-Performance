# ProLab Performance

Aplicação web de treino e performance: planos por objetivo/nível, calculadora de IMC,
temporizador HIIT, checklist semanal e histórico de evolução — com contas de utilizador
e dados persistidos no servidor.

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | HTML + CSS (design system próprio) + JavaScript (ES Modules, sem frameworks) |
| Backend | PHP 8.3, arquitetura em camadas (Router → Controllers → Repositories → PDO) |
| Base de dados | PostgreSQL (produção/Render) · MySQL ou SQLite (desenvolvimento) |
| Deploy | Docker (php:8.3-apache) no Render, via Blueprint |

## Arquitetura

```
public/               ← docroot (única pasta exposta ao browser)
  index.html          ← SPA por abas
  api.php             ← front controller da API (/api/*)
  .htaccess           ← rewrites (produção)
  assets/css|js/      ← design system + módulos ES
src/
  bootstrap.php       ← autoloader, env, tratamento global de erros
  Core/               ← Router, Request, Response, Auth (sessão), Env
  Database/           ← Connection (DATABASE_URL multi-driver), Schema (migração idempotente)
  Repositories/       ← acesso a dados (users, profiles, measurements, checklists)
  Controllers/        ← Auth, Profile, Measurement, Plan, Checklist, Health
  Content/            ← catálogo de planos de treino
server.php            ← router do servidor embutido do PHP (só dev)
Dockerfile            ← imagem de produção
render.yaml           ← blueprint do Render (web service + PostgreSQL)
```

O schema é criado automaticamente no primeiro arranque (`CREATE TABLE IF NOT EXISTS`)
para o driver ativo — não há passo manual de migração.

## API

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET | `/api/health` | — | health check (usado pelo Render) |
| POST | `/api/auth/register` | — | criar conta (auto-login) |
| POST | `/api/auth/login` | — | iniciar sessão |
| POST | `/api/auth/logout` | ✔ | terminar sessão |
| GET | `/api/auth/session` | — | estado da sessão atual |
| GET | `/api/profile` | ✔ | perfil do utilizador |
| PUT | `/api/profile` | ✔ | guardar perfil (regista medida quando há peso) |
| GET | `/api/measurements` | ✔ | histórico de medidas (gráfico de evolução) |
| GET | `/api/plans` | — | catálogo: objetivos e níveis |
| GET | `/api/plans/{objetivo}/{nível}` | — | plano completo + rotina semanal |
| GET | `/api/checklist?week=2026-W27` | ✔ | checklist da semana |
| PUT | `/api/checklist` | ✔ | guardar checklist da semana |

Todas as respostas são JSON com `success: boolean`. Erros usam códigos HTTP
apropriados (401, 404, 405, 409, 422, 500).

## Correr localmente

Requisitos: PHP 8.2+ (com `pdo_sqlite`, já incluído por padrão).

```bash
php -S 127.0.0.1:8000 -t public server.php
```

Abre <http://127.0.0.1:8000>. Sem configuração extra a app usa SQLite em `./data/`.
Para usar MySQL local, copia `.env.example` para `.env` e define `DATABASE_URL`.

> **Conta demo (não usa a API):** `demo@prolab.dev` / `demo1234` — servida 100%
> client-side (`public/assets/js/demo.js`), com perfil, histórico e checklist
> persistidos em localStorage. Funciona mesmo sem backend a correr; qualquer
> outra conta usa sempre a API real.

## Deploy no Render

### Opção A — Blueprint (recomendado)

1. Faz push do repositório para o GitHub.
2. No Render: **New → Blueprint** e seleciona o repositório.
3. O `render.yaml` cria o web service (Docker) e o PostgreSQL já ligados. Pronto.

### Opção B — Manual

1. **New → PostgreSQL** (plano free) e copia a *Internal Database URL*.
2. **New → Web Service** → runtime **Docker**, aponta para o repositório.
3. Env vars: `DATABASE_URL` = URL copiada, `APP_ENV` = `production`.
4. Health check path: `/api/health`.

> **Nota (plano free):** o PostgreSQL free do Render expira após 30 dias —
> para manter os dados, faz upgrade da base de dados ou usa um Postgres externo
> gratuito (ex.: Neon) na `DATABASE_URL`.

## Segurança

- Palavras-passe com `password_hash` (bcrypt/argon2, conforme o default do PHP) e rehash automático.
- Sessões: cookie `HttpOnly` + `SameSite=Lax` + `Secure` atrás de HTTPS; id regenerado no login.
- SQL sempre com prepared statements (PDO, emulação desligada).
- Validação de entrada em todos os endpoints (422 com mensagem clara).
- Atraso aleatório em falhas de login para dificultar enumeração de contas.
- Docroot restrito a `public/` — código e dados ficam fora do alcance do browser.
