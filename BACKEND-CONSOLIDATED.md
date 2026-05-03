# Express backend — consolidated reference

This file is a **read-only snapshot** of the Node/Express API (excluding `node_modules/`, `package-lock.json`, and the `frontend/` app). The runnable project stays split across these paths; do not try to execute this document.

**Layout**

| Path |
|------|
| [package.json](#packagejson) |
| [.gitignore](#gitignore) |
| [.env.example](#envexample) |
| [server.js](#serverjs) |
| [config/db.js](#configdbjs) |
| [routes/index.js](#routesindexjs) |
| [routes/testRoutes.js](#routestestroutesjs) |
| [routes/uploadRoutes.js](#routesuploadroutesjs) |
| [routes/searchRoutes.js](#routessearchroutesjs) |
| [routes/imagesRoutes.js](#routesimagesroutesjs) |
| [middleware/uploadMiddleware.js](#middlewareuploadmiddlewarejs) |
| [controllers/testController.js](#controllerstestcontrollerjs) |
| [controllers/uploadController.js](#controllersuploadcontrollerjs) |
| [controllers/searchController.js](#controllerssearchcontrollerjs) |
| [controllers/imagesController.js](#controllersimagescontrollerjs) |
| [models/Image.js](#modelsimagejs) |
| [services/vision/detectLabels.js](#servicesvisiondetectlabelsjs) |

---

## package.json

```json
{
  "name": "express-backend",
  "version": "1.0.0",
  "description": "Clean Express backend",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "dotenv": "^16.6.1",
    "express": "^4.21.2",
    "mongoose": "^8.23.1",
    "multer": "^2.1.1"
  }
}
```

---

## .gitignore

```
node_modules
.env
```

---

## .env.example

```
PORT=3001
MONGODB_URI=mongodb://127.0.0.1:27017/photo-organizer

# Google Cloud Vision API key (REST). Enable Cloud Vision API on your GCP project.
VISION_API_KEY=your_api_key_here

# Optional: max labels returned per image (default 20)
# VISION_MAX_RESULTS=20
```

---

## server.js

```javascript
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const routes = require("./routes");
const { connectToDatabase, disconnectFromDatabase } = require("./config/db");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));

app.use("/", routes);

async function startServer() {
  try {
    await connectToDatabase();
    const server = app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });

    const shutdown = async (signal) => {
      console.log(`${signal} received, shutting down...`);
      server.close(async () => {
        await disconnectFromDatabase();
        process.exit(0);
      });
    };

    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
}

startServer();
```

---

## config/db.js

```javascript
const mongoose = require("mongoose");

async function connectToDatabase() {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error(
      "MONGODB_URI is not set. Copy .env.example to .env and fill in MONGODB_URI."
    );
  }

  mongoose.connection.on("error", (err) => {
    console.error("MongoDB connection error:", err.message);
  });
  mongoose.connection.on("disconnected", () => {
    console.warn("MongoDB disconnected");
  });

  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
  console.log("MongoDB connected");
}

async function disconnectFromDatabase() {
  await mongoose.connection.close();
}

module.exports = { connectToDatabase, disconnectFromDatabase };
```

---

## routes/index.js

```javascript
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
```

---

## routes/testRoutes.js

```javascript
const express = require("express");
const { testHandler } = require("../controllers/testController");

const router = express.Router();

router.get("/", testHandler);

module.exports = router;
```

---

## routes/uploadRoutes.js

```javascript
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
```

---

## routes/searchRoutes.js

```javascript
const express = require("express");
const { searchImages } = require("../controllers/searchController");

const router = express.Router();

router.get("/", searchImages);

module.exports = router;
```

---

## routes/imagesRoutes.js

```javascript
const express = require("express");
const { getAllImages } = require("../controllers/imagesController");

const router = express.Router();

router.get("/", getAllImages);

module.exports = router;
```

---

## middleware/uploadMiddleware.js

```javascript
const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.join(process.cwd(), "uploads"));
  },
  filename: (_req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(
      file.originalname
    )}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (_req, file, cb) => {
  if (file.mimetype && file.mimetype.startsWith("image/")) {
    cb(null, true);
    return;
  }

  cb(new Error("Only image files are allowed"));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

module.exports = upload;
```

---

## controllers/testController.js

```javascript
const testHandler = (_req, res) => {
  res.json({ message: "API working" });
};

module.exports = { testHandler };
```

---

## controllers/uploadController.js

```javascript
const { detectLabelsFromImagePath } = require("../services/vision/detectLabels");
const Image = require("../models/Image");

const uploadImage = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  try {
    const labels = await detectLabelsFromImagePath(req.file.path);
    const publicFilePath = `/uploads/${req.file.filename}`;
    const publicFileUrl = `${req.protocol}://${req.get("host")}${publicFilePath}`;

    const savedImage = await Image.create({
      filePath: publicFileUrl,
      labels,
    });

    return res.status(201).json({
      message: "Image uploaded successfully",
      image: savedImage,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload processing failed";

    return res.status(500).json({
      error: "Failed to process and save uploaded image",
      details: message,
    });
  }
};

module.exports = { uploadImage };
```

---

## controllers/searchController.js

```javascript
const Image = require("../models/Image");

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const searchImages = async (req, res) => {
  const query = (req.query.q || "").trim();

  if (!query) {
    return res.status(400).json({ error: "Query parameter 'q' is required" });
  }

  try {
    const escapedQuery = escapeRegex(query);
    const images = await Image.aggregate([
      {
        $addFields: {
          matchedLabels: {
            $filter: {
              input: "$labels",
              as: "label",
              cond: {
                $regexMatch: {
                  input: "$$label.description",
                  regex: escapedQuery,
                  options: "i",
                },
              },
            },
          },
        },
      },
      {
        $match: {
          "matchedLabels.0": { $exists: true },
        },
      },
      {
        $addFields: {
          highestMatchConfidence: { $max: "$matchedLabels.confidence" },
        },
      },
      {
        $sort: { highestMatchConfidence: -1, createdAt: -1 },
      },
    ]);

    return res.status(200).json({ images });
  } catch (error) {
    const details =
      error instanceof Error ? error.message : "Search query failed";
    return res.status(500).json({ error: "Failed to search images", details });
  }
};

module.exports = { searchImages };
```

---

## controllers/imagesController.js

```javascript
const Image = require("../models/Image");

const getAllImages = async (_req, res) => {
  try {
    const images = await Image.find().sort({ createdAt: -1 });
    return res.status(200).json({ images });
  } catch (error) {
    const details =
      error instanceof Error ? error.message : "Failed to fetch images";
    return res.status(500).json({ error: "Failed to fetch images", details });
  }
};

module.exports = { getAllImages };
```

---

## models/Image.js

```javascript
const mongoose = require("mongoose");

const labelSchema = new mongoose.Schema(
  {
    description: { type: String, required: true },
    confidence: { type: Number, required: true },
  },
  { _id: false }
);

const imageSchema = new mongoose.Schema({
  filePath: { type: String, required: true },
  labels: {
    type: [labelSchema],
    default: [],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Image", imageSchema);
```

---

## services/vision/detectLabels.js

```javascript
const fs = require("fs/promises");
const https = require("https");

const VISION_HOST = "vision.googleapis.com";
const VISION_PATH = "/v1/images:annotate";

function postVisionAnnotate(apiKey, payload) {
  const query = `?key=${encodeURIComponent(apiKey)}`;
  const body = JSON.stringify(payload);

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: VISION_HOST,
        path: VISION_PATH + query,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body, "utf8"),
        },
      },
      (res) => {
        let raw = "";
        res.on("data", (chunk) => {
          raw += chunk;
        });
        res.on("end", () => {
          try {
            resolve({
              statusCode: res.statusCode,
              data: raw ? JSON.parse(raw) : {},
            });
          } catch (err) {
            reject(err);
          }
        });
      }
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

/**
 * Reads an image from disk and returns label annotations via Vision REST API.
 * @param {string} imageFilePath - Absolute or relative path to the image file
 * @param {object} [options]
 * @param {number} [options.maxResults=20] - Max number of labels to return
 * @returns {Promise<Array<{ description: string, confidence: number }>>}
 */
async function detectLabelsFromImagePath(imageFilePath, options = {}) {
  const apiKey = process.env.VISION_API_KEY;
  if (!apiKey || !String(apiKey).trim()) {
    throw new Error("VISION_API_KEY is not set");
  }

  const envMax = process.env.VISION_MAX_RESULTS
    ? parseInt(process.env.VISION_MAX_RESULTS, 10)
    : NaN;
  const maxResults =
    options.maxResults ??
    (Number.isFinite(envMax) && envMax > 0 ? envMax : 20);

  const buffer = await fs.readFile(imageFilePath);
  const content = buffer.toString("base64");

  const payload = {
    requests: [
      {
        image: { content },
        features: [{ type: "LABEL_DETECTION", maxResults }],
      },
    ],
  };

  const { statusCode, data } = await postVisionAnnotate(apiKey, payload);

  if (statusCode < 200 || statusCode >= 300) {
    const msg =
      data?.error?.message ||
      `Vision API request failed (${statusCode})`;
    throw new Error(msg);
  }

  const first = data.responses?.[0];
  if (first?.error) {
    throw new Error(first.error.message || "Vision API returned an error");
  }

  const annotations = first?.labelAnnotations || [];

  return annotations.map((label) => ({
    description: label.description || "",
    confidence: typeof label.score === "number" ? label.score : 0,
  }));
}

module.exports = { detectLabelsFromImagePath };
```

---

## API routes (summary)

| Method | Path | Handler |
|--------|------|---------|
| GET | `/test` | Health / ping |
| POST | `/upload` | Multipart field `image`; Vision labels + Mongo save |
| GET | `/search?q=` | Search images by label text |
| GET | `/images` | List all images |
| Static | `/uploads/*` | Saved files from `server.js` |

---

*Generated as a documentation snapshot. Run the app with `npm start` from the repo root after `npm install` and a valid `.env`.*
