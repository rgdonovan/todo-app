const { dbQuery } = require("./db-query");
const bcrypt = require("bcrypt");

module.exports = class PGPersistence {
  constructor(session) {
    this.username = session.username;
  }
  // if the todoList has at least one todo and all of its todos are marked done, then the 
  // todoList is done. Otherwise, it's undone.
  isDoneTodoList(todoList) {
    return todoList.todos.length > 0 && todoList.todos.every(todo => todo.done);
  }

  // does the list have any undone todos? returns true if yes, false if no.
  hasUndoneTodos(todoList) {
    return todoList.todos.some(todo => !todo.done);
  }

  // Returns a copy of the indicated todo in the indicated todo list. Returns
  // `undefined` if either the todo list or the todo is not found. Note that
  // both IDs must be numeric.
  async loadTodo(todoListId, todoId) {
    const FIND_TODO = 'SELECT * FROM todos WHERE todolist_id = $1 AND id = $2 AND username = $3';
    let result = await dbQuery(FIND_TODO, todoListId, todoId, this.username);
    return result.rows[0];
  }

  // Returns a copy of the todo list with the indicated ID. Returns 
  // 'undefined' if not found. Note that 'todoListId' must be numeric.
  async loadTodoList(todoListId) {
    const FIND_TODOLIST = 'SELECT * FROM todolists WHERE id = $1 AND username = $2';
    const FIND_TODOS = 'SELECT * FROM todos WHERE todolist_id = $1 AND username = $2';

    let resultTodoList = dbQuery(FIND_TODOLIST, todoListId, this.username);
    let resultTodos = dbQuery(FIND_TODOS, todoListId, this.username);
    let resultBoth = await Promise.all([resultTodoList, resultTodos]);

    let todoList = resultBoth[0].rows[0];
    if (!todoList) return undefined;

    todoList.todos = resultBoth[1].rows;
    return todoList;
  }

  _partititonTodoLists(todoLists) {
    let undone = [];
    let done = [];

    todoLists.forEach(todoList => {
      if (this.isDoneTodoList(todoList)) {
        done.push(todoList);
      } else {
        undone.push(todoList);
      }
    });

    return undone.concat(done);
  }

  // Return the list of todo lists sorted by completion status
  // and title (case-insensitive)
  async sortedTodoLists() {
    const FIND_USER_TODOLISTS = "SELECT * FROM todolists WHERE username = $1 ORDER BY lower(title) ASC";
    const FIND_USER_TODOS = "SELECT * FROM todos WHERE username = $1";

    let resultTodoLists = dbQuery(FIND_USER_TODOLISTS, this.username);
    let resultTodos = dbQuery(FIND_USER_TODOS, this.username);

    let resultBoth = await Promise.all([resultTodoLists, resultTodos]);

    let todoLists = resultBoth[0].rows;
    let todos = resultBoth[1].rows;

    todoLists.forEach(todoList => {
      todoList.todos = todos.filter(todo => todo.todolist_id === todoList.id);
    });
    
    return this._partititonTodoLists(todoLists);
  }

  async sortedTodos(todoListId) {
    const SORTED_TODOS = 'SELECT * FROM todos WHERE todolist_id = $1 AND username = $2 ORDER BY done ASC, lower(title) ASC';
    
    let result = await dbQuery(SORTED_TODOS, todoListId, this.username);
    return result.rows;
  }

  async toggleDoneTodo(todoListId, todoId) {
    const TOGGLE_TODO = 'UPDATE todos SET done = NOT done WHERE todolist_id = $1 AND id = $2 AND username = $3'

    let result = await dbQuery(TOGGLE_TODO, todoListId, todoId, this.username);
    return result.rowCount > 0;
  }

  async deleteTodo(todoListId, todoId) {
    const DELETE_TODO = 'DELETE FROM todos WHERE todolist_id = $1 AND id = $2 AND username = $3';
    
    let result = await dbQuery(DELETE_TODO, todoListId, todoId, this.username);
    return result.rowCount > 0;
  }

  async deleteTodoList(todoListId) {
    const DELETE_TODOLIST = 'DELETE FROM todolists WHERE id = $1 AND username = $2';

    let result = await dbQuery(DELETE_TODOLIST, todoListId, this.username);
    return result.rowCount > 0;
  }

  async completeAllTodos(todoListId) {
    const COMPLETE_ALL_TODOS = 'UPDATE todos SET done = true WHERE todolist_id = $1 AND username = $2 AND NOT done';
    let result = await dbQuery(COMPLETE_ALL_TODOS, todoListId, this.username);

    return result.rowCount > 0;
  }

  async setTodoListTitle(todoListId, title) {
    const SET_TITLE = 'UPDATE todolists SET title = $2 WHERE id = $1 AND username = $3';

    let result = await dbQuery(SET_TITLE, todoListId, title, this.username);
    return result.rowCount > 0;
  }

  async existsTodoListTitle(title) {
    const FIND_TITLE = 'SELECT null FROM todolists WHERE title = $1 AND username = $2';
    
    let result = await dbQuery(FIND_TITLE, title, this.username);
    return result.rowCount > 0;
  }

  async createTodoList(title) {
    const CREATE_TODOLIST = 'INSERT INTO todolists (title) VALUES ($1)';

    try {
    let result = await dbQuery(CREATE_TODOLIST, title);
    return result.rowCount > 0;
    } catch (error) {
      if (this.isUniqueConstraintViolation(error)) return false;
      throw error;
    }
  }

  async createTodo(todoListId, todoTitle) {
    const CREATE_TODO = 'INSERT INTO todos (todolist_id, title) VALUES ($1, $2)';
    let result = await dbQuery(CREATE_TODO, todoListId, todoTitle);
    
    return result.rowCount > 0;
  }

  isUniqueConstraintViolation(error) {
    return /duplicate key value violates unique constraint/.test(String(error));
  }

  async authenticate(username, password) {
    const FIND_HASHED_PASSWORD = 'SELECT password FROM users WHERE username = $1';
    
    let result = await dbQuery(FIND_HASHED_PASSWORD, username);
    if (result.rowCount === 0) return false;

    return bcrypt.compare(password, result.rows[0].password);
  }
};
