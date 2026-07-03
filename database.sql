-- ProLab Performance — schema da base de dados
-- Inferido a partir de login.php / register.php / perfil.php.
-- Uso: mysql -u root -p < database.sql

CREATE DATABASE IF NOT EXISTS prolab
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE prolab;

-- Utilizadores (autenticação)
CREATE TABLE IF NOT EXISTS utilizadores (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nome          VARCHAR(100) NOT NULL,
  email         VARCHAR(190) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  criado_em     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_utilizadores_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Perfil (1:1 com utilizador; PK em utilizador_id permite o ON DUPLICATE KEY UPDATE)
CREATE TABLE IF NOT EXISTS perfis (
  utilizador_id INT UNSIGNED NOT NULL,
  idade         INT NULL,
  peso_kg       DECIMAL(5,2) NULL,
  altura_m      DECIMAL(4,2) NULL,
  objetivo      VARCHAR(20) NULL,
  nivel         VARCHAR(20) NOT NULL DEFAULT 'iniciante',
  genero        VARCHAR(20) NULL,
  bf            DECIMAL(5,2) NULL,
  PRIMARY KEY (utilizador_id),
  CONSTRAINT fk_perfis_utilizador
    FOREIGN KEY (utilizador_id) REFERENCES utilizadores (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Histórico de medidas (uma linha por gravação de perfil com peso)
CREATE TABLE IF NOT EXISTS medidas (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  utilizador_id INT UNSIGNED NOT NULL,
  peso_kg       DECIMAL(5,2) NULL,
  altura_m      DECIMAL(4,2) NULL,
  imc           DECIMAL(5,2) NULL,
  criado_em     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_medidas_utilizador (utilizador_id),
  CONSTRAINT fk_medidas_utilizador
    FOREIGN KEY (utilizador_id) REFERENCES utilizadores (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de exercícios
CREATE TABLE IF NOT EXISTS exercicios (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nome VARCHAR(100) NOT NULL,
  grupo_muscular VARCHAR(50) NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de sessões de treino
CREATE TABLE IF NOT EXISTS sessoes_treino (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  utilizador_id INT UNSIGNED NOT NULL,
  data_sessao DATE NOT NULL,
  tipo_treino VARCHAR(100) NOT NULL,
  duracao_minutos INT NULL,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_sessoes_utilizador
    FOREIGN KEY (utilizador_id) REFERENCES utilizadores (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de séries realizadas
CREATE TABLE IF NOT EXISTS series_realizadas (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  sessao_id INT UNSIGNED NOT NULL,
  exercicio_id INT UNSIGNED NOT NULL,
  carga_kg DECIMAL(6,2) NOT NULL DEFAULT 0.00,
  repeticoes INT NOT NULL DEFAULT 0,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_series_sessao
    FOREIGN KEY (sessao_id) REFERENCES sessoes_treino (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_series_exercicio
    FOREIGN KEY (exercicio_id) REFERENCES exercicios (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Inserir alguns exercícios de exemplo
INSERT IGNORE INTO exercicios (id, nome, grupo_muscular) VALUES
(1, 'Supino Plano', 'Peito'),
(2, 'Agachamento Livre', 'Pernas'),
(3, 'Peso Morto', 'Costas');
