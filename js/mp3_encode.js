/**
 * Fast MP3 encoding using lamejs with Int16Array blocks (no push-per-sample).
 * Requires vendor/lame.min.js loaded on the page (global `lamejs`).
 *
 * @param {AudioBuffer} audioBuffer
 * @param {(pct:number)=>void} onProgress  pct in [0..1]
 * @returns {Promise<Blob>}
 */
export async function encodeAudioBufferToMp3(audioBuffer, onProgress) {
  if (typeof lamejs === "undefined") {
    throw new Error("lamejs not found. Ensure vendor/lame.min.js is loaded.");
  }

  const sampleRate = audioBuffer.sampleRate;
  const numChannels = Math.min(2, audioBuffer.numberOfChannels || 1);
  const mp3encoder = new lamejs.Mp3Encoder(numChannels, sampleRate, 128);

  const leftF = audioBuffer.getChannelData(0);
  const rightF = numChannels === 2 ? audioBuffer.getChannelData(1) : null;

  const sampleBlockSize = 1152;
  const totalSamples = audioBuffer.length;
  const totalBlocks = Math.ceil(totalSamples / sampleBlockSize);

  const mp3Chunks = [];

  const report = (v) => {
    if (typeof onProgress === "function") onProgress(Math.max(0, Math.min(1, v)));
  };

  let block = 0;
  for (let i = 0; i < totalSamples; i += sampleBlockSize) {
    const len = Math.min(sampleBlockSize, totalSamples - i);

    // Allocate exact-sized Int16 blocks
    const left = new Int16Array(len);
    let right = null;
    if (numChannels === 2) right = new Int16Array(len);

    // Float32 -> Int16 conversion
    for (let j = 0; j < len; j++) {
      let sL = leftF[i + j];
      sL = Math.max(-1, Math.min(1, sL));
      left[j] = (sL < 0 ? sL * 32768 : sL * 32767) | 0;

      if (right) {
        let sR = rightF[i + j];
        sR = Math.max(-1, Math.min(1, sR));
        right[j] = (sR < 0 ? sR * 32768 : sR * 32767) | 0;
      }
    }

    let mp3buf;
    if (numChannels === 1) {
      mp3buf = mp3encoder.encodeBuffer(left);
    } else {
      mp3buf = mp3encoder.encodeBuffer(left, right);
    }

    if (mp3buf && mp3buf.length) mp3Chunks.push(mp3buf);

    block++;
    // update progress frequently but cheaply
    if (block % 8 === 0) {
      report(block / totalBlocks);
      // yield to UI occasionally
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  const endBuf = mp3encoder.flush();
  if (endBuf && endBuf.length) mp3Chunks.push(endBuf);
  report(1);

  return new Blob(mp3Chunks, { type: "audio/mpeg" });
}