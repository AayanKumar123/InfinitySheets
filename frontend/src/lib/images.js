// Camera / file → compressed JPEG data URL. Photos of working are sent to the
// AI for transcription and a small thumbnail is kept on the worksheet, so
// both sizes are produced here.

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read that image')); };
    img.src = url;
  });
}

function draw(img, maxSide, quality) {
  const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);   // flatten transparency
  ctx.drawImage(img, 0, 0, w, h);
  return c.toDataURL('image/jpeg', quality);
}

/**
 * Resolve to { full, thumb } data URLs. `full` (≤1600px) goes to the AI,
 * `thumb` (≤420px) is what gets stored with the worksheet.
 */
export async function prepareImage(file) {
  if (!file || !/^image\//.test(file.type)) throw new Error('Please choose a photo');
  const img = await loadImage(file);
  return { full: draw(img, 1600, 0.8), thumb: draw(img, 420, 0.7), width: img.width, height: img.height };
}

export function dataUrlParts(dataUrl) {
  const m = /^data:([^;]+);base64,(.*)$/.exec(dataUrl || '');
  return m ? { mimeType: m[1], data: m[2] } : null;
}

// Any file (a PDF, say) → { mimeType, data } base64 parts for the AI.
export function fileToParts(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(dataUrlParts(r.result));
    r.onerror = () => reject(new Error('Could not read that file'));
    r.readAsDataURL(file);
  });
}

/**
 * Photos are compressed, PDFs are passed through. Resolves to
 * [{ mimeType, data, label, thumb?, name }] ready for askAi({ files }).
 */
export async function filesToAiParts(files, { label } = {}) {
  const out = [];
  for (const f of Array.from(files || [])) {
    if (/^image\//.test(f.type)) {
      const p = await prepareImage(f);
      out.push({ ...dataUrlParts(p.full), label, thumb: p.thumb, name: f.name });
    } else if (f.type === 'application/pdf' || /\.pdf$/i.test(f.name)) {
      if (f.size > 8 * 1024 * 1024) throw new Error(`${f.name} is over 8 MB. Split it or export a smaller PDF.`);
      const p = await fileToParts(f);
      out.push({ mimeType: 'application/pdf', data: p.data, label, name: f.name });
    } else {
      throw new Error(`${f.name}: only photos and PDFs are supported`);
    }
  }
  return out;
}
