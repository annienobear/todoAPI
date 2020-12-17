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

app.post("/newItem", async (req, res) => {

});