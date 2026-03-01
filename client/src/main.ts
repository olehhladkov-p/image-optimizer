import { VALID_FORMATS } from '../../shared/types.js';

/**
 * 1. DOM Elements Reference Manager
 */
const elements = {
  form: document.getElementById('optimizerForm') as HTMLFormElement,
  imageInput: document.getElementById('imageInput') as HTMLInputElement,
  imageName: document.getElementById('imageName') as HTMLInputElement,
  nameInputWrapper: document.getElementById('nameInputWrapper') as HTMLDivElement,
  imageFormat: document.getElementById('imageFormat') as HTMLSelectElement,
  settingsArea: document.getElementById('settingsArea') as HTMLDivElement,
  errorBanner: document.getElementById('errorBanner') as HTMLDivElement,
  errorMessage: document.getElementById('errorMessage') as HTMLSpanElement,
  successBanner: document.getElementById('successBanner') as HTMLDivElement,
  successMessage: document.getElementById('successMessage') as HTMLParagraphElement,
  submitBtn: document.getElementById('submitBtn') as HTMLButtonElement,
  resetButtons: [
    document.getElementById('resetBtn'),
    document.getElementById('successResetBtn')
  ] as HTMLButtonElement[],
  closeButtons: [
    document.getElementById('closeErrorBtn'),
    document.getElementById('closeSuccessBtn')
  ] as HTMLButtonElement[],
  loadingSpinner: document.getElementById('loadingSpinner') as unknown as SVGElement,
  imagePreview: document.getElementById('imagePreview') as HTMLImageElement,
  previewGrid: document.getElementById('previewGrid') as HTMLDivElement,
  uploadIcon: document.getElementById('uploadIcon') as HTMLDivElement,
  uploadText: document.getElementById('uploadText') as HTMLParagraphElement,
  uploadSubtext: document.getElementById('uploadSubtext') as HTMLParagraphElement,
};

/**
 * 2. Utility Helpers
 */
const Utils = {
  formatSize(bytes: number) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024, sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  downloadBlob(blob: Blob, filename: string) {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    }, 150);
  },

  parseFilenameFromHeader(disposition: string | null, fallback: string) {
    if (disposition?.includes('attachment')) {
      const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(disposition);
      if (matches?.[1]) return matches[1].replace(/['"]/g, '');
    }
    return fallback;
  }
};

/**
 * 3. UI State Manager
 */
const UI = {
  setLoading(isLoading: boolean) {
    const { submitBtn, loadingSpinner } = elements;
    submitBtn.disabled = isLoading;
    submitBtn.setAttribute('aria-busy', isLoading.toString());
    submitBtn.classList.toggle('opacity-75', isLoading);
    submitBtn.classList.toggle('cursor-not-allowed', isLoading);
    loadingSpinner.classList.toggle('hidden', !isLoading);
  },

  showToast(type: 'error' | 'success', msg: string) {
    const isError = type === 'error';
    const target = isError ? elements.errorBanner : elements.successBanner;
    const other = isError ? elements.successBanner : elements.errorBanner;
    const msgTarget = isError ? elements.errorMessage : elements.successMessage;

    msgTarget.innerHTML = msg;
    target.classList.remove('hidden');
    other.classList.add('hidden');

    setTimeout(() => target.focus(), 100);
  },

  clearToasts() {
    elements.errorBanner.classList.add('hidden');
    elements.successBanner.classList.add('hidden');
  },

  reset() {
    elements.form.reset();
    elements.imagePreview.src = '';
    elements.imagePreview.classList.add('hidden');
    elements.previewGrid.innerHTML = '';
    elements.previewGrid.classList.add('hidden');
    elements.nameInputWrapper.classList.remove('hidden');
    [elements.uploadIcon, elements.uploadText, elements.uploadSubtext].forEach(el => el.classList.remove('hidden'));
    this.clearToasts();
    elements.imageInput.focus();
  }
};

/**
 * 4. API Service Layer
 */
const API = {
  async optimize(formData: FormData) {
    const response = await fetch('/optimize', { method: 'POST', body: formData });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || 'The server failed to optimize.');
    }

    return {
      blob: await response.blob(),
      filename: Utils.parseFilenameFromHeader(response.headers.get('content-disposition'), 'optimized.zip')
    };
  }
};

/**
 * 5. Event Listeners & Orchestration
 */

elements.imageInput.addEventListener('change', async (e) => {
  const files = (e.target as HTMLInputElement).files;

  if (!files || files.length === 0) {
    UI.reset();
    return;
  }

  UI.clearToasts();
  elements.previewGrid.innerHTML = '';
  [elements.uploadIcon, elements.uploadText, elements.uploadSubtext].forEach(el => el.classList.add('hidden'));

  if (files.length === 1) {
    const file = files[0];
    const reader = new FileReader();
    reader.onload = (ev) => {
      elements.imagePreview.src = ev.target?.result as string;
      elements.imagePreview.classList.remove('hidden');
      elements.previewGrid.classList.add('hidden');
    };
    reader.readAsDataURL(file);

    const parts = file.name.split('.');
    const ext = parts.pop()?.toLowerCase() || '';
    elements.imageName.value = parts.join('.');
    elements.nameInputWrapper.classList.remove('hidden');

    const supported = Array.from(elements.imageFormat.options).map(o => o.value);
    elements.imageFormat.value = supported.includes(ext) ? ext : '';
  } else {
    elements.imagePreview.classList.add('hidden');
    elements.previewGrid.classList.remove('hidden');
    elements.nameInputWrapper.classList.add('hidden');

    for (const file of Array.from(files)) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = document.createElement('img');
        img.src = ev.target?.result as string;
        img.className = 'w-full h-20 object-cover rounded shadow-sm';
        elements.previewGrid.appendChild(img);
      };
      reader.readAsDataURL(file);
    }
  }
});

elements.resetButtons.forEach(btn => btn?.addEventListener('click', () => UI.reset()));
elements.closeButtons.forEach(btn => btn?.addEventListener('click', () => UI.clearToasts()));

elements.form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const files = elements.imageInput.files;
  if (!files || files.length === 0) return UI.showToast('error', 'Please select images first.');

  UI.clearToasts();
  UI.setLoading(true);

  try {
    const formData = new FormData();
    for (const file of Array.from(files)) {
      formData.append('images', file);
    }

    if (files.length === 1 && elements.imageName.value.trim()) {
      formData.append('name', elements.imageName.value.trim());
    }
    if (elements.imageFormat.value) {
      formData.append('format', elements.imageFormat.value);
    }

    const { blob, filename } = await API.optimize(formData);
    Utils.downloadBlob(blob, filename);

    const totalOriginalSize = Array.from(files).reduce((acc, f) => acc + f.size, 0);
    const diff = totalOriginalSize - blob.size;
    const savingsText = diff > 0
      ? `Saved ${Utils.formatSize(diff)} (${Math.round((diff / totalOriginalSize) * 100)}%)`
      : `Processed successfully (${Utils.formatSize(blob.size)})`;

    UI.showToast('success', `
      <strong>${filename}</strong> downloaded!<br>
      <span class="mt-1 inline-block opacity-80 text-xs font-mono uppercase tracking-wider">${savingsText}</span>
    `);

  } catch (err: any) {
    UI.showToast('error', err.message);
  } finally {
    UI.setLoading(false);
  }
});
