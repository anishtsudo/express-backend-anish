const express = require("express");
const { searchImages } = require("../controllers/searchController");

const router = express.Router();

router.get("/", searchImages);

module.exports = router;

