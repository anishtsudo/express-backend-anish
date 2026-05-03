const express = require("express");
const testRoutes = require("./testRoutes");
const uploadRoutes = require("./uploadRoutes");
const searchRoutes = require("./searchRoutes");
const imagesRoutes = require("./imagesRoutes");

const router = express.Router();

router.use("/test", testRoutes);
router.use("/upload", uploadRoutes);
router.use("/search", searchRoutes);
router.use("/images", imagesRoutes);

module.exports = router;

