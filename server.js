/**
 * PROGRAMAÇÃO DE SERVIÇOS WEB - PROJETO FINAL
 * Servidor Node.js com Express e MySQL
 */

const express = require("express");
const mysql = require("mysql2");
const bodyParser = require("body-parser");
const session = require("express-session");
const bcrypt = require("bcryptjs");

const app = express();
const PORT = 3000;

// --- MIDDLEWARES ---
// Permite ler JSON no corpo das requisições (POST/PUT)
app.use(bodyParser.json());
// Serve os ficheiros estáticos (HTML, CSS, JS) da pasta 'public'
app.use(express.static("public"));
// Configuração da gestão de sessões (Login)
app.use(
  session({
    secret: "segredo_projeto_psw",
    resave: false,
    saveUninitialized: true,
  })
);

// --- LIGAÇÃO À BASE DE DADOS ---
const db = mysql.createConnection({
  host: "localhost",
  user: "psw", // Utilizador específico do projeto
  password: "psw",
  database: "psw_movies",
});

db.connect((err) => {
  if (err) console.error("Erro Crítico na BD:", err);
  else console.log("✓ Base de Dados MySQL conectada com sucesso.");
});

// --- MIDDLEWARE PERSONALIZADO: LOGS ---
// Intercepta todos os pedidos à API para registar estatísticas
const logAccess = (req, res, next) => {
  if (req.session.userId) {
    // Regista o acesso na tabela para criar o Ranking depois
    const sql = "INSERT INTO access_logs (user_id) VALUES (?)";
    db.query(sql, [req.session.userId], (err) => {
      if (err) console.error("Erro ao gravar log:", err);
    });
  }
  next(); // Passa o controlo para a próxima função (a rota real)
};
app.use("/api", logAccess); // Aplica apenas nas rotas /api

// --- SETUP INICIAL ---
app.get("/setup", (req, res) => {
  // Cria o admin com password encriptada se não existir
  const hash = bcrypt.hashSync("admin", 10);
  db.query(
    "INSERT IGNORE INTO users (username, password, role) VALUES (?, ?, ?)",
    ["admin", hash, "admin"],
    (err) => {
      if (err) res.send("Erro: " + err.message);
      else
        res.send(
          'Admin pronto (User: admin / Pass: admin). <a href="/">Voltar</a>'
        );
    }
  );
});

// ========================================================
// ROTAS DE AUTENTICAÇÃO (Segurança)
// ========================================================

/**
 * Registo de novos utilizadores
 * Utiliza bcrypt para encriptar a password antes de guardar na BD
 */
app.post("/auth/register", (req, res) => {
  const { username, password } = req.body;
  const hash = bcrypt.hashSync(password, 10); // Hashing (Salt 10)

  db.query(
    "INSERT INTO users (username, password) VALUES (?, ?)",
    [username, hash],
    (err) => {
      if (err)
        return res.json({ success: false, message: "Utilizador já existe!" });
      res.json({ success: true });
    }
  );
});

/**
 * Login
 * Compara a password enviada com a hash guardada na BD
 */
app.post("/auth/login", (req, res) => {
  const { username, password } = req.body;
  db.query(
    "SELECT * FROM users WHERE username = ?",
    [username],
    (err, results) => {
      if (results.length > 0) {
        // Verificação segura da password
        const match = bcrypt.compareSync(password, results[0].password);
        if (match) {
          // Guarda dados na sessão do servidor
          req.session.userId = results[0].id;
          req.session.role = results[0].role;
          return res.json({ success: true, role: results[0].role });
        }
      }
      res
        .status(401)
        .json({ success: false, message: "Credenciais Inválidas" });
    }
  );
});

app.post("/auth/logout", (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

// ========================================================
// API RESTful (Filmes)
// ========================================================

// GET: Listar todos os filmes
app.get("/api/movies", (req, res) => {
  db.query("SELECT * FROM movies ORDER BY id DESC", (err, results) =>
    res.json(results)
  );
});

// POST: Criar novo filme
app.post("/api/movies", (req, res) => {
  const { title, director, year, genre } = req.body;
  const sql =
    "INSERT INTO movies (title, director, year, genre) VALUES (?,?,?,?)";
  db.query(sql, [title, director, year, genre], (err, result) => {
    if (err) res.status(500).json({ error: err.message });
    else res.json({ id: result.insertId });
  });
});

// DELETE: Apagar filme
app.delete("/api/movies/:id", (req, res) => {
  db.query("DELETE FROM movies WHERE id = ?", [req.params.id], () =>
    res.json({ success: true })
  );
});

// ========================================================
// API DASHBOARD & ESTATÍSTICAS
// ========================================================

// Adicionar aos favoritos (Tabela user_movies)
app.post("/api/my-movies", (req, res) => {
  if (!req.session.userId) return res.status(403).send("Não autorizado");
  db.query(
    "INSERT IGNORE INTO user_movies (user_id, movie_id) VALUES (?, ?)",
    [req.session.userId, req.body.movieId],
    () => res.json({ success: true })
  );
});

// Listar favoritos do utilizador logado
app.get("/api/my-movies", (req, res) => {
  if (!req.session.userId) return res.status(403).send("Não autorizado");
  const sql = `SELECT m.* FROM movies m 
                 JOIN user_movies um ON m.id = um.movie_id 
                 WHERE um.user_id = ?`;
  db.query(sql, [req.session.userId], (err, results) => res.json(results));
});

// Ranking de utilizadores (Query com JOIN e GROUP BY)
app.get("/api/stats", (req, res) => {
  const sql = `SELECT u.username, COUNT(l.id) as acessos 
                 FROM users u 
                 JOIN access_logs l ON u.id = l.user_id 
                 GROUP BY u.id 
                 ORDER BY acessos DESC`;
  db.query(sql, (err, results) => res.json(results));
});

// Iniciar Servidor
app.listen(PORT, () => {
  console.log(`✓ Servidor a correr em http://localhost:${PORT}`);
  console.log(`✓ Sistema de Logs e Encriptação (Bcrypt) Ativos.`);
});
