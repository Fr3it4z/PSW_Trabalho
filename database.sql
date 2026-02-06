-- 1. CONFIGURAÇÃO DE SEGURANÇA (Cria o user 'psw' para o servidor se ligar)
CREATE USER IF NOT EXISTS 'psw'@'localhost' IDENTIFIED BY 'psw';
GRANT ALL PRIVILEGES ON *.* TO 'psw'@'localhost';
FLUSH PRIVILEGES;

-- 2. CRIAÇÃO DA BASE DE DADOS
CREATE DATABASE IF NOT EXISTS psw_movies;
USE psw_movies;

-- 3. CRIAÇÃO DAS TABELAS

-- Tabela de Utilizadores
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL, -- VARCHAR(255) serve perfeitamente para a hash
    role ENUM('admin', 'user') DEFAULT 'user'
);

-- Tabela de Filmes
CREATE TABLE IF NOT EXISTS movies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    director VARCHAR(100),
    year INT,
    genre VARCHAR(50)
);

-- Tabela de Seleção (Dashboard Personalizado)
CREATE TABLE IF NOT EXISTS user_movies (
    user_id INT,
    movie_id INT,
    PRIMARY KEY(user_id, movie_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (movie_id) REFERENCES movies(id)
);

-- Tabela de Logs (Estatísticas)
CREATE TABLE IF NOT EXISTS access_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    access_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 4. DADOS DE TESTE OBRIGATÓRIOS
-- NOTA: A password 'admin' abaixo já está ENCRIPTADA.
-- O texto '$2b$10$UM4S1dMsXBmeHgsAcznezO7dxE8b1HDApF4JIAb3GCz01ggaMfpaa' corresponde à palavra-passe 'admin'
INSERT IGNORE INTO users (username, password, role) VALUES 
('admin', '$2b$10$UM4S1dMsXBmeHgsAcznezO7dxE8b1HDApF4JIAb3GCz01ggaMfpaa', 'admin');

INSERT IGNORE INTO movies (title, director, year, genre) VALUES 
('Inception', 'Nolan', 2010, 'Sci-Fi'), 
('Matrix', 'Wachowski', 1999, 'Sci-Fi');