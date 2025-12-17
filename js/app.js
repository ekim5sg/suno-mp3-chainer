import { mergeMp3sWithCrossfade } from "./audio_merge.js";

const els = {
  dropZone: document.getElementById("dropZone"),
  fileInput: document.getElementById("fileInput"),
  chooseBtn: document.getElementById("chooseBtn"),
  fileList: document.getElementById("fileList"),
  processBtn: document.getElementById("processBtn"),
  crossfadeSlider: document.getElementById("crossfadeSlider"),
  crossfadeValue: document.getElementById("crossfadeValue"),
  progressContainer: document.getElementById("progressContainer"),
  progressFill: document.getElementById("progressFill"),
  statusMessage: document.getElementById("statusMessage"),
  downloadSection: document.getElementById("downloadSection"),
  downloadBtn: document.getElementById("downloadBtn"),
  audioPreview: document.getElementById("audioPreview"),
  debugLog: document.getElementById("debugLog"),
};

let uploadedFiles = [];
let mergedBlob = null;
let previewUrl = null;
let busy = false;

function log(message) {
  console.log(message);
  els.debugLog.style.display = "block";
  els.debugLog.innerHTML += `${message}<br>`;
  els.debugLog.scrollTop = els.debugLog.scrollHeight;
}

function setBusy(isBusy) {
  busy = isBusy;
  els.processBtn.disabled = isBusy || uploadedFiles.length < 2;
  els.fileInput.disabled = isBusy;
  els.chooseBtn.disabled = isBusy;
}

function updateProgress(percent, message) {
  const p = Math.max(0, Math.min(100, Math.round(percent)));
  els.progressContainer.style.display = "block";
  els.progressFill.style.width = `${p}%`;
  els.progressFill.textContent = `${p}%`;
  els.statusMessage.textContent = message || "";
}

function updateProcessButton() {
  els.processBtn.disabled = busy || uploadedFiles.length < 2;
  if (uploadedFiles.length < 2) {
    els.processBtn.textContent = "Merge MP3s with Crossfade (Need at least 2 files)";
  } else {
    els.processBtn.textContent = `Merge ${uploadedFiles.length} MP3s with Crossfade`;
  }
}

function updateFileList() {
  els.fileList.innerHTML = "";
  if (uploadedFiles.length === 0) return;

  uploadedFiles.forEach((file, index) => {
    const fileItem = document.createElement("div");
    fileItem.className = "file-item";
    fileItem.innerHTML = `
      <span class="file-name">${index + 1}. ${file.name}</span>
      <span class="file-duration">${(file.size / (1024 * 1024)).toFixed(2)} MB</span>
      <button class="remove-btn" type="button">Remove</button>
    `;
    fileItem.querySelector(".remove-btn").addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      uploadedFiles.splice(index, 1);
      mergedBlob = null;
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      previewUrl = null;
      els.downloadSection.style.display = "none";
      updateFileList();
      updateProcessButton();
      log(`Removed file ${index + 1}`);
    });
    els.fileList.appendChild(fileItem);
  });
}

function handleFiles(files) {
  const mp3Files = Array.from(files).filter(
    (file) => file.type === "audio/mpeg" || file.name.toLowerCase().endsWith(".mp3")
  );

  if (mp3Files.length === 0) {
    alert("Please select MP3 files only.");
    return;
  }

  uploadedFiles = [...uploadedFiles, ...mp3Files];
  mergedBlob = null;
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = null;
  els.downloadSection.style.display = "none";

  updateFileList();
  updateProcessButton();
  log(`Loaded ${mp3Files.length} file(s). Total: ${uploadedFiles.length}`);
}

// Drag/drop
els.dropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  els.dropZone.classList.add("dragover");
});
els.dropZone.addEventListener("dragleave", () => {
  els.dropZone.classList.remove("dragover");
});
els.dropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  els.dropZone.classList.remove("dragover");
  if (busy) return;
  handleFiles(e.dataTransfer.files);
});

// Picker open (button + click-on-zone)
function openPicker() {
  if (busy) return;
  els.fileInput.click();
}

els.chooseBtn.addEventListener("click", (e) => {
  e.preventDefault();
  e.stopPropagation();
  openPicker();
});

els.dropZone.addEventListener("click", (e) => {
  if (busy) return;
  const tag = (e.target?.tagName || "").toLowerCase();
  if (tag === "button" || tag === "input") return;
  openPicker();
});

els.fileInput.addEventListener("change", (e) => {
  if (busy) return;
  if (e.target.files && e.target.files.length > 0) {
    handleFiles(e.target.files);
  }
  // allow selecting same file again later
  e.target.value = "";
});

// Slider label
els.crossfadeSlider.addEventListener("input", (e) => {
  els.crossfadeValue.textContent = `${parseFloat(e.target.value).toFixed(1)}s`;
});

// Process
els.processBtn.addEventListener("click", async () => {
  if (busy) return;
  if (uploadedFiles.length < 2) return;

  setBusy(true);
  els.downloadSection.style.display = "none";
  updateProgress(0, "Starting…");

  try {
    const fadeSeconds = parseFloat(els.crossfadeSlider.value);
    log(`Processing ${uploadedFiles.length} file(s) with ${fadeSeconds}s crossfade…`);

    const result = await mergeMp3sWithCrossfade(
      uploadedFiles,
      fadeSeconds,
      (pct, msg) => updateProgress(pct, msg)
    );

    mergedBlob = result.blob;

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = result.url;

    els.audioPreview.src = previewUrl;
    els.downloadSection.style.display = "block";
    updateProgress(100, "Complete!");
    log(`Done. Output bytes: ${mergedBlob.size}`);
  } catch (err) {
    console.error(err);
    updateProgress(0, `Error: ${err?.message || String(err)}`);
    alert(`Error: ${err?.message || String(err)}\n\nSee debug log for details.`);
    log(`ERROR: ${err?.stack || err}`);
  } finally {
    setBusy(false);
    updateProcessButton();
  }
});

// Download
els.downloadBtn.addEventListener("click", () => {
  if (!mergedBlob) {
    alert("No merged file available yet.");
    return;
  }

  const url = URL.createObjectURL(mergedBlob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `merged_audio_${Date.now()}.mp3`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 250);
  log("Download triggered.");
});

// Init
updateProcessButton();
log("App initialized.");