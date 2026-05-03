const express = require("express");
const { testHandler } = require("../controllers/testController");

const router = express.Router();

router.get("/", testHandler);

module.exports = router;

