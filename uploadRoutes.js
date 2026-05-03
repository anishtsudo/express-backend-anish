const express = require("express");
const upload = require("../middleware/uploadMiddleware");
const { uploadImage } = require("../controllers/uploadController");

const router = express.Router();

router.post("/", (req, res) => {
  const uploadSingle = upload.single("image");

  uploadSingle(req, res, (err) => {
    if (err) {
      const isMulterError = err.name === "MulterError";
      const statusCode = isMulterError ? 400 : 500;

      return res.status(statusCode).json({
        error: err.message || "Failed to upload image",
      });
    }

    return void uploadImage(req, res).catch((handlerErr) => {
      console.error(handlerErr);
      return res.status(500).json({ error: "Unexpected server error during upload" });
    });
  });
});

module.exports = router;

