const express = require("express");
const bodyParser = require("body-parser");
const session = require("express-session");
const crypto = require("crypto");
const mysql = require("mysql");
const path = require("path");

const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(
  session({ secret: "my-secret-key", resave: true, saveUninitialized: true })
);

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static("views")); // Serve os arquivos estáticos da pasta 'public'

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "gerirvendas",
});

db.connect((err) => {
  if (err) throw err;
  console.log("Conectado ao MySQL");
});

// Função para hash de senha com SHA-256
function hashPassword(password) {
  const hash = crypto.createHash("sha256");
  hash.update(password);
  return hash.digest("hex");
}

// Rota de login
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (username && password) {
    db.query(
      "SELECT * FROM usuarios WHERE username = ?",
      [username],
      (err, results) => {
        if (err) throw err;

        if (results.length > 0) {
          const user = results[0];

          const hashedPassword = hashPassword(password);

          if (hashedPassword === user.password) {
            req.session.loggedin = true;
            req.session.username = user.username;
            req.session.idUser = user.id;
            res.render("home", { username: req.session.username });
          } else {
            res.send("Senha incorreta!");
          }
        } else {
          res.send("Usuário não encontrado!");
        }
      }
    );
  } else {
    res.send("Por favor, insira usuário e senha!");
  }
});

app.get("/CadastroUser", (req, res) => {
  res.render("cadastro");
});

// Rota home
app.get("/home", (req, res) => {
  if (req.session.loggedin) {
    res.render("home", { username: req.session.username });
  } else {
    res.send("Por favor, faça login para acessar a página home.");
  }
});

// Rota de logout
app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    // Se desejar redirecionar, envie uma resposta JSON indicando o sucesso e a URL para redirecionamento
    res.json({ success: true, redirectUrl: "/" });
  });
});

// Rota de cadastro de usuario
app.post("/register", (req, res) => {
  const { username, password } = req.body;

  if (username && password) {
    const hashedPassword = hashPassword(password);

    // Verifica se o usuário já existe
    db.query(
      "SELECT * FROM usuarios WHERE username = ?",
      [username],
      (err, results) => {
        if (err) throw err;

        if (results.length > 0) {
          res.send("Usuário já cadastrado. Escolha outro nome de usuário.");
        } else {
          // Insere o novo usuário no banco de dados
          db.query(
            "INSERT INTO usuarios (username, password) VALUES (?, ?)",
            [username, hashedPassword],
            (insertErr) => {
              if (insertErr) throw insertErr;

              res.send(
                'Cadastro realizado com sucesso! Faça login <a href="./public/index.ejs">aqui</a>.'
              );
            }
          );
        }
      }
    );
  } else {
    res.send("Por favor, insira usuário e senha!");
  }
});

// Rota para renderizar a página de cadastro de vendedores
app.get("/vendedores", (req, res) => {
  // Buscar vendedores do banco de dados
  db.query(
    "SELECT * FROM vendedores where id_usuario = " + req.session.idUser,
    async (err, results) => {
      if (err) throw err;

      const vendedores = await results;

      res.render("vendedores", { vendedores_array: vendedores });
    }
  );
});

// Rota para receber o formulário de cadastro
app.post("/cadastro-vendedor", (req, res) => {
  const { nome, telefone } = req.body;

  // Inserir vendedor no banco de dados
  db.query(
    "INSERT INTO vendedores (nome, telefone, id_usuario) VALUES (?, ?, ?)",
    [nome, telefone, req.session.idUser],
    (err, result) => {
      if (err) throw err;

      console.log("Vendedor cadastrado no banco de dados");

      res.redirect("/vendedores");
    }
  );
});

//Rota para página de edição do vendedor
app.get("/edit_vendedor/:id_vendedor", (req, res) => {
  const vendedorId = req.params.id_vendedor;

  // Consultar o banco de dados para obter os detalhes do vendedor
  db.query(
    "SELECT * FROM vendedores WHERE id = ?",
    [vendedorId],
    (err, results) => {
      if (err) throw err;

      // Verificar se o vendedor foi encontrado
      if (results.length > 0) {
        const vendedor = results[0];
        // Renderizar a página de edição com os detalhes do vendedor
        res.render("editarVendedor", { vendedor });
      } else {
        // Redirecionar para uma página de erro ou lidar conforme necessário
        res.redirect("/vendedores");
      }
    }
  );
});

//Rota para editar o vendedor
app.post("/update_vendedor/:id_vendedor", (req, res) => {
  const vendedorId = req.params.id_vendedor;
  const { nome, telefone } = req.body;

  // Atualizar o banco de dados com as novas informações
  db.query(
    "UPDATE vendedores SET nome=?, telefone=? WHERE id=?",
    [nome, telefone, vendedorId],
    (err, results) => {
      if (err) throw err;

      // Redirecionar para a página de listagem de vendedores após a atualização
      res.redirect("/vendedores");
    }
  );
});

//Rotas de clientes
app.get("/clientes", (req, res) => {
  //busca clientes do banco de dados
  db.query(
    "SELECT * FROM clientes WHERE id_usuario =" + req.session.idUser,
    async (err, results) => {
      if (err) throw err;

      const clientes = await results;
      res.render("clientes", { clientes_array: clientes });
    }
  );
});

app.post("/cadastro-cliente", (req, res) => {
  const { nome_cliente, telefone_cliente, endereco_cliente } = req.body;

  //Inserir cliente no baco de dados
  db.query(
    "INSERT INTO clientes (nome_cliente, telefone_cliente, endereco_cliente, id_usuario) VALUES (?, ?, ?, ?)",
    [nome_cliente, telefone_cliente, endereco_cliente, req.session.idUser],
    (err, results) => {
      if (err) throw err;
      console.log("Cliente cadastrado no banco de dados");
      res.redirect("/clientes");
    }
  );
});

app.get("/edit_cliente/:id_cliente", (req, res) => {
  const clienteId = req.params.id_cliente;

  //consultar o banco de dados para obter os detalhes do cliente
  db.query(
    "SELECT * FROM clientes WHERE id_cliente = ?",
    [clienteId],
    (err, results) => {
      if (err) throw err;

      //verifica se o cliente não foi encontrado
      if (results.length > 0) {
        const cliente = results[0];
        //renderiza a página de edição com os detalhes do vendedor
        res.render("editarClientes", { cliente });
      } else {
        //redireciona para uma página de erro ou lidar conforme o necessário
        res.redirect("/clientes");
      }
    }
  );
});

//Rota para editar o cliente
app.post("/update_cliente/:id_cliente", (req, res) => {
  const clienteId = req.params.id_cliente;
  const { nome_cliente, telefone_cliente, endereco_cliente } = req.body;

  //Atualiza o banco de dados com as novas informações
  db.query(
    "UPDATE clientes SET nome_cliente=?, telefone_cliente=?, endereco_cliente=? WHERE id_cliente=?",
    [nome_cliente, telefone_cliente, endereco_cliente, clienteId],
    (err, results) => {
      if (err) throw err;
      console.log(err);

      //Redirecionar para a página de listagem de clientes após a atualização
      res.redirect("/clientes");
    }
  );
});

app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
