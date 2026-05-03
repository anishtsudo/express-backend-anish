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

