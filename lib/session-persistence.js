const SeedData = require("./seed-data");
const deepCopy = require("./deep-copy");
const { sortTodoLists, sortTodos } = require("./sort");
const nextId = require("./next-id");

module.exports = class SessionPersistence {
  constructor(session) {
    this._todoLists = session.todoLists || deepCopy(SeedData);
    session.todoLists = this._todoLists;
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
  loadTodo(todoListId, todoId) {
    let todo = this._findTodo(todoListId, todoId);
    return deepCopy(todo);
  }

  // Returns a copy of the todo list with the indicated ID. Returns 
  // 'undefined' if not found. Note that 'todoListId' must be numeric.
  loadTodoList(todoListId) {
    let todoList = this._findTodoList(todoListId);
    return deepCopy(todoList);
  }

  _findTodoList(todoListId) {
    return this._todoLists.find(todoList => todoList.id === todoListId);
    
  }

  _findTodo(todoListId, todoId) {
    let todoList = this._findTodoList(todoListId);
    if (!todoList) return undefined;

    return todoList.todos.find(todo => todo.id === todoId);
  }
  // Return the list of todo lists sorted by completion status
  // and title (case-insensitive)
  sortedTodoLists() {
    let todoLists = deepCopy(this._todoLists);
    let undone = todoLists.filter(todoList => !this.isDoneTodoList(todoList));
    let done = todoLists.filter(todoList => this.isDoneTodoList(todoList));
    return sortTodoLists(undone, done);
  }

  sortedTodos(todoList) {
    let todos = todoList.todos;
    let undone = todos.filter(todo => !todo.done);
    let done = todos.filter(todo => todo.done);
    return deepCopy(sortTodos(undone, done));
  }

  toggleDoneTodo(todoListId, todoId) {
    let todo = this._findTodo(todoListId, todoId);
    if (!todo) return false;

    todo.done = !todo.done;
    return true;
  }

  deleteTodo(todoListId, todoId) {
    let todoList = this._findTodoList(todoListId);
    if (!todoList) return false;

    let todoIndex = todoList.todos.findIndex(todo => todo.id === todoId);
    if (todoIndex === -1) return false;

    todoList.todos.splice(todoIndex, 1);
    return true;
  }

  deleteTodoList(todoListId) {
    let todoListIndex = this._todoLists.findIndex(todoList => todoList.id === todoListId);

    if (todoListIndex === -1) return false;

    this._todoLists.splice(todoListIndex, 1);
    return true;
  }

  completeAllTodos(todoListId) {
    let todoList = this._findTodoList(todoListId);
    if (!todoList) return false;

    todoList.todos.filter(todo => !todo.done)
      .forEach(todo => todo.done = true);
    return true;
  }

  createTodo(todoListId, todoTitle) {
    let todoList = this._findTodoList(todoListId);
    if (!todoList) return false;

    todoList.todos.push({
      id: nextId(),
      title: todoTitle,
      done: false,
    });
    return true;
  }

  setTodoListTitle(todoListId, title) {
    let todoList = this._findTodoList(todoListId);
    if (!todoList) return false;

    todoList.title = title;
    return true;
  }

  existsTodoListTitle(title) {
    return this._todoLists.some(todoList => todoList.title === title);
  }

  createTodoList(title) {
    this._todoLists.push({
      title,
      id: nextId(),
      todos: [],
    });

    return true;
  }

  isUniqueConstraintViolation(_error) {
    return false;
  }
};
