const express = require("express");
const cors = require("cors");

const { v4: uuidv4, validate } = require("uuid");

const app = express();
app.use(express.json());
app.use(cors());

const users = [];

function checksExistsUserAccount(request, response, next) {
  const { username } = request.headers;

  const verifyUserExists = users.find((user) => user.username === username);

  if (!verifyUserExists) {
    return response.status(404);
  }

  request.user = verifyUserExists;

  next();
}

function checksCreateTodosUserAvailability(request, response, next) {
  const { todos, pro } = request.user;

  if (todos.length >= 10 && !pro) {
    return response.status(403);
  }

  next();
}

function checksTodoExists(request, response, next) {
  const { username } = request.headers;
  const { id: todoId } = request.params;

  if (!validate(todoId)) {
    return response.status(400);
  }

  const findUser = users.find((user) => user.username === username);

  if (!findUser) {
    return response.status(404);
  }

  const findTodoInUserTodos = findUser.todos.find((todo) => todo.id === todoId);

  if (!findTodoInUserTodos) {
    return response.status(404);
  }

  request.todo = findTodoInUserTodos;
  request.user = findUser;

  next();
}

function findUserById(request, response, next) {
  const { id: userId } = request.params;

  const foundedUser = users.find((user) => user.id === userId);

  if (!foundedUser) {
    return response.status(404);
  }

  request.user = foundedUser;

  next();
}

app.post("/users", (request, response) => {
  const { name, username } = request.body;

  console.log("passou aqui");

  const usernameAlreadyExists = users.some(
    (user) => user.username === username
  );

  if (usernameAlreadyExists) {
    return response.status(400).send({ error: "Username already exists" });
  }

  const user = {
    id: uuidv4(),
    name,
    username,
    pro: false,
    todos: [],
  };

  users.push(user);

  return response.status(201).send(user);
});

app.get("/users/:id", findUserById, (request, response) => {
  const { user } = request;

  return response.json(user);
});

app.patch("/users/:id/pro", findUserById, (request, response) => {
  const { user } = request;

  if (user.pro) {
    return response
      .status(400)
      .json({ error: "Pro plan is already activated." });
  }

  user.pro = true;

  return response.json(user);
});

app.get("/todos", checksExistsUserAccount, (request, response) => {
  const { user } = request;

  return response.json(user.todos);
});

app.post(
  "/todos",
  checksExistsUserAccount,
  checksCreateTodosUserAvailability,
  (request, response) => {
    const { title, deadline } = request.body;
    const { user } = request;

    const newTodo = {
      id: uuidv4(),
      title,
      deadline: new Date(deadline),
      done: false,
      created_at: new Date(),
    };

    user.todos.push(newTodo);

    return response.status(201).json(newTodo);
  }
);

app.put("/todos/:id", checksTodoExists, (request, response) => {
  const { title, deadline } = request.body;
  const { todo } = request;

  todo.title = title;
  todo.deadline = new Date(deadline);

  return response.json(todo);
});

app.patch("/todos/:id/done", checksTodoExists, (request, response) => {
  const { todo } = request;

  todo.done = true;

  return response.json(todo);
});

app.delete(
  "/todos/:id",
  checksExistsUserAccount,
  checksTodoExists,
  (request, response) => {
    const { user, todo } = request;

    const todoIndex = user.todos.indexOf(todo);

    if (todoIndex === -1) {
      return response.status(404).json({ error: "Todo not found" });
    }

    user.todos.splice(todoIndex, 1);

    return response.status(204).send();
  }
);

module.exports = {
  app,
  users,
  checksExistsUserAccount,
  checksCreateTodosUserAvailability,
  checksTodoExists,
  findUserById,
};
