import React from "react";
import { useEffect, useMemo, useState } from "react";

const API_BASE_URL = "http://localhost:3001";
const getImageSrc = (filePath) => {
  if (!filePath) return "";
  if (filePath.startsWith("http://") || filePath.startsWith("https://")) {
    return filePath;
  }
  const cleaned = filePath.replace(/^\/+/, "");
  return `${API_BASE_URL}/${cleaned}`;
};
const getTopLabels = (labels = []) =>
  labels
    .slice()
    .sort((a, b) => (b?.confidence || 0) - (a?.confidence || 0))
    .slice(0, 3);
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadMessage, setUploadMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [searching, setSearching] = useState(false);

  const canUpload = useMemo(
    () => !!selectedFile && !uploading && !searching,
    [selectedFile, uploading, searching]
  );
  const searchRegex = useMemo(() => {
    const keyword = searchQuery.trim();
    if (!keyword) return null;
    return new RegExp(escapeRegExp(keyword), "i");
  }, [searchQuery]);
  const fetchAllImages = async () => {
    const response = await fetch(`${API_BASE_URL}/images`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to load images");
    }

    setImages(data.images || []);
  };

  useEffect(() => {
    fetchAllImages().catch((error) => {
      setUploadMessage(error.message || "Failed to load images");
    });
  }, []);

  const handleUpload = async (event) => {
    event.preventDefault();
    if (!selectedFile) {
      setUploadMessage("Please choose an image first.");
      return;
    }

    const formData = new FormData();
    formData.append("image", selectedFile);

    try {
      setUploading(true);
      setUploadMessage("");

      const response = await fetch(`${API_BASE_URL}/upload`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Upload failed");
      }

      setUploadMessage("Image uploaded successfully.");

      if (data.image) {
        setImages((prev) => [data.image, ...prev]);
      }
    } catch (error) {
      setUploadMessage(error.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSearch = async (event) => {
    event.preventDefault();

    try {
      setSearching(true);
      const keyword = searchQuery.trim();

      if (!keyword) {
        await fetchAllImages();
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/search?q=${encodeURIComponent(keyword)}`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Search failed");
      }

      setImages(data.images || []);
    } catch (error) {
      setUploadMessage(error.message || "Search failed");
    } finally {
      setSearching(false);
    }
  };

  return (
    <main className="page">
      <section className="container">
        <h1>AI Photo Organizer</h1>

        <form className="panel" onSubmit={handleUpload}>
          <label htmlFor="image-input">Upload image</label>
          <input
            id="image-input"
            type="file"
            accept="image/*"
            onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
          />
          <button type="submit" disabled={!canUpload}>
            {uploading ? "Uploading..." : "Upload"}
          </button>
          {uploading ? <span className="spinner" aria-label="Uploading" /> : null}
        </form>

        <form className="panel search-row" onSubmit={handleSearch}>
          <input
            type="text"
            placeholder="Search by label (e.g. dog)"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
          <button type="submit" disabled={searching || uploading}>
            Search
          </button>
          {searching ? <span className="spinner" aria-label="Searching" /> : null}
        </form>

        {uploadMessage ? <p className="status">{uploadMessage}</p> : null}

        <section className="grid">
          {images.map((image) => (
            <article className="card" key={image._id || image.filePath}>
              <img src={getImageSrc(image.filePath)} alt="Uploaded file" />
              <div className="labels">
                <p className="labels-title">Top labels</p>
                <ul className="labels-list">
                  {getTopLabels(image.labels).map((label) => (
                    <li
                      className={`label-item${
                        searchRegex && searchRegex.test(label.description)
                          ? " label-item-match"
                          : ""
                      }`}
                      key={`${image.filePath}-${label.description}`}
                    >
                      <span>{label.description}</span>
                      <span>{Math.round((label.confidence || 0) * 100)}%</span>
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </section>
      </section>
    </main>
  );
}

export default App;

