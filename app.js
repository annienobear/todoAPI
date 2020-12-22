"use strict";
const express = require("express");
const app = express();
const sqlite3 = require("sqlite3");
const sqlite = require("sqlite");
const multer = require("multer");

const LOCAL_HOST = 8080;
const OK_NUM = 200;
const ERROR_NUM = 500;
const BAD_REQUEST = 400;

app.use(express.json()); // application/json
app.use(express.urlencoded({extended: true})); // application/x-www-form-urlencoded
app.use(multer().none()); // multer module for form data

app.post("/login", async (req, res) => {
  let name = req.body.username;
  try {
    let db = await getDBConnection();
    let userID = await checkIfUserExist(name);
    let listID, allItems, completeItems;
    if (userID === null) {
      let createNewUser = "INSERT INTO user(name) VALUES(?)";
      let row = await db.run(createNewUser, name);
      userID = row.lastID;
      let createNewList = "INSERT INTO list(user_id, all_items_id, completed_items_id) VALUES(?, ?, ?)";
      let data = [userID, JSON.stringify([]), JSON.stringify([])];
      let listRow = await db.run(createNewList, data);
      listID = listRow.lastID;
      allItems = [];
      completeItems = [];
    } else {
      let getListQry = "SELECT id, all_items_id, completed_items_id FROM list WHERE user_id =?";
      let rows = await db.get(getListQry, userID);
      listID = rows.id;
      let allIDs = rows.all_items_id;
      let completeIDs = rows.completed_items_id;
      allItems = await giveListOfItems(JSON.parse(allIDs));
      completeItems = await giveListOfItems(JSON.parse(completeIDs));
    }
    await db.close();
    res.status(OK_NUM).json({
      "list_id": parseInt(listID),
      "user_id": parseInt(userID),
      "all_items": allItems,
      "completed_items": completeItems
    });
  } catch (err) {
    console.log(err);
    // res.status(ERROR_NUM).json({"error": "Internal server error"});
  }
});

app.post("/newItem", async (req, res) => {
  let userID = req.body.userID;
  let content = req.body.content;
  console.log(userID)
  console.log(content)
  try {
    let db = await getDBConnection();
    let updateListQry = "UPDATE list SET all_items_id = ? WHERE user_id = ?";
    let updateItemQry = "INSERT INTO items(text) VALUES(?)";
    let itemRow = await db.run(updateItemQry, JSON.stringify(content));
    let itemID = itemRow.lastID;
    let previousIDs = await getPreviousIDs(userID, false);
    previousIDs = JSON.parse(previousIDs);
    previousIDs.push(itemID);
    let data = [JSON.stringify(previousIDs), userID];
    await db.run(updateListQry, data);
    await db.close();
    res.status(OK_NUM).json({
      "id": parseInt(itemID),
      "text": content
    })
  } catch (err) {
    console.log(err);
  }
});

app.post("/checkItem", async(req, res) => {
  let itemID = req.body.item_id;
  let userID = req.body.userID;
  try {
    let db = await getDBConnection();
    let updateListQry = "UPDATE list SET completed_items_id = ? WHERE user_id = ?"
    let previousIDs = await getPreviousIDs(userID, true);
    previousIDs = JSON.parse(previousIDs);
    previousIDs.push(itemID);
    let data = [JSON.stringify(previousIDs), userID];
    await db.run(updateListQry, data);
    await db.close();
    res.status(OK_NUM).json({
      "user_id": parseInt(userID),
      "item_id": parseInt(itemID)
    })
  } catch (err) {
    console.log(err);
  }
});

async function getPreviousIDs(userID, selectOrNot) {
  let db = await getDBConnection();
  let query;
  if (selectOrNot) {
    query = "SELECT completed_items_id FROM list WHERE user_id = ?";
  } else {
    query = "SELECT all_items_id FROM list WHERE user_id = ?";
  }
  let row = await db.get(query, userID);
  await db.close();
  if (selectOrNot) {
    return row.completed_items_id;
  }
  return row.all_items_id;
}

/**
 * Return user id if exist, null if not exist
 * @param {text} name username
 */
async function checkIfUserExist(name) {
  let db = await getDBConnection();
  let query = "SELECT id FROM user WHERE name = ?";
  let row = await db.get(query, name);
  await db.close();
  if (row === undefined) {
    return null;
  }
  return row.id;
}

async function giveListOfItems(list) {
  let result = [];
  for (let i = 0; i < list.length; i++) {
    let current = list[i];
    let currentText = await getTextByID(current);
    result.push({
      "id": parseInt(current),
      "text": JSON.parse(currentText)
    })
  }
  console.log(result);
  return result;
}

/**
 * Return text of current id
 * @param {number} id id of item
 */
async function getTextByID(id) {
  let db = await getDBConnection();
  let query = "SELECT text FROM items WHERE id = ?";
  let row = await db.get(query, id);
  await db.close();
  return row.text;
}

/**
 * Establishes a database connection to the database and returns the database object.
 * Any errors that occur during con. should be caught in the function that calls this one.
 * @returns {Object} - The database object for the connection.
 */
async function getDBConnection() {
  const db = await sqlite.open({
    filename: "todo.db",
    driver: sqlite3.Database
  });
  return db;
}

app.use(express.static("public"));
const PORT = process.env.PORT || LOCAL_HOST;
app.listen(PORT);
