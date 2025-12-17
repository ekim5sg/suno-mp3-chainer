import { encodeAudioBufferToMp3 } from "./mp3_encode.js";

/**
 * Merge MP3s with crossfade using WebAudio OfflineAudioContext,
 * then encode to MP3 (lamejs).
 *
 * @param {File[]} files
 * @param {number} crossfadeSeconds
 * @param {(pct:number,msg:string)=>void} onProgress
 * @returns {Promise<{blob:Blob,url:string}>}
 */
export async function mergeMp3sWithCrossfade(files, crossfadeSeconds, onProgress) {
  if (!files || files.length < 2) throw new Error("Need at least 2 MP3 files.");
  const fade = Math.max(0, Number(crossfadeSeconds) || 0);

  const report = (pct, msg) => {
    if (typeof onProgress === "function") onProgress(pct, msg);
  };

  report(2, "Creating audio context…");
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();

  // Decode
  report(5, `Decoding ${files.length} MP3(s)…`);
  const buffers = [];
  for (let i = 0; i < files.length; i++) {
    report(5 + (i / files.length) * 25, `Decoding ${i + 1}/${files.length}: ${files[i].name}`);
    const arr = await files[i].arrayBuffer();
    const buf = await audioContext.decodeAudioData(arr);
    buffers.push(buf);
  }

  // Compute total duration with overlaps
  report(32, "Calculating timeline…");
  let totalDuration = 0;
  for (let i = 0; i < buffers.length; i++) {
    totalDuration += buffers[i].duration;
    if (i < buffers.length - 1) totalDuration -= fade;
  }
  totalDuration = Math.max(0.01, totalDuration);

  const sampleRate = audioContext.sampleRate;
  const channels = 2;

  report(36, "Creating offline render context…");
  const offline = new OfflineAudioContext(
    channels,
    Math.ceil(totalDuration * sampleRate),
    sampleRate
  );

  // Schedule with fades
  report(40, "Scheduling crossfades…");
  let t = 0;
  for (let i = 0; i < buffers.length; i++) {
    const src = offline.createBufferSource();
    src.buffer = buffers[i];

    const gain = offline.createGain();
    src.connect(gain);
    gain.connect(offline.destination);

    // Fade-in except first
    if (i > 0 && fade > 0) {
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(1, t + fade);
    }

    // Fade-out except last
    if (i < buffers.length - 1 && fade > 0) {
      const fadeOutStart = t + buffers[i].duration - fade;
      gain.gain.setValueAtTime(1, fadeOutStart);
      gain.gain.linearRampToValueAtTime(0, fadeOutStart + fade);
    }

    src.start(t);
    t += buffers[i].duration - (i < buffers.length - 1 ? fade : 0);

    report(40 + (i / buffers.length) * 20, `Queued ${i + 1}/${buffers.length}`);
  }

  // Render
  report(60, "Rendering audio…");
  const rendered = await offline.startRendering();

  // Encode
  report(80, "Encoding MP3…");
  const mp3Blob = await encodeAudioBufferToMp3(rendered, (encPct) => {
    // encPct is 0..1, map to 80..99
    const pct = 80 + Math.round(encPct * 19);
    report(pct, `Encoding… ${Math.round(encPct * 100)}%`);
  });

  report(100, "Complete!");
  const url = URL.createObjectURL(mp3Blob);
  return { blob: mp3Blob, url };
}