const express = require("express");
const { getAllImages } = require("../controllers/imagesController");

const router = express.Router();

router.get("/", getAllImages);

module.exports = router;

