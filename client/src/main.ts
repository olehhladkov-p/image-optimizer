import { VALID_FORMATS } from '../../shared/types.js';

/**
 * 1. DOM Elements Reference Manager
 */
const elements = {
  form: document.getElementById('optimizerForm') as HTMLFormElement,
  imageInput: document.getElementById('imageInput') as HTMLInputElement,
  imageName: document.getElementById('imageName') as HTMLInputElement,
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

    // Smoothly focus the banner for screen readers
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
    [elements.uploadIcon, elements.uploadText, elements.uploadSubtext].forEach(el => el.classList.remove('hidden'));
    this.clearToasts();

    // Return focus to the start of the flow
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
      throw new Error(data.error || 'The server failed to optimize this image.');
    }

    return {
      blob: await response.blob(),
      filename: Utils.parseFilenameFromHeader(response.headers.get('content-disposition'), 'optimized-image')
    };
  }
};

/**
 * 5. Event Listeners & Orchestration
 */

// File selection & Auto-population
elements.imageInput.addEventListener('change', (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];

  if (!file) {
    UI.reset();
    return;
  }

  UI.clearToasts();

  const reader = new FileReader();
  reader.onload = (ev) => {
    elements.imagePreview.src = ev.target?.result as string;
    elements.imagePreview.classList.remove('hidden');
    [elements.uploadIcon, elements.uploadText, elements.uploadSubtext].forEach(el => el.classList.add('hidden'));
  };
  reader.readAsDataURL(file);

  const parts = file.name.split('.');
  const ext = parts.pop()?.toLowerCase() || '';
  elements.imageName.value = parts.join('.');

  const supported = Array.from(elements.imageFormat.options).map(o => o.value);
  elements.imageFormat.value = supported.includes(ext) ? ext : '';
});

// Reset Buttons
elements.resetButtons.forEach(btn => btn?.addEventListener('click', () => UI.reset()));

// Close Banner Buttons
elements.closeButtons.forEach(btn => btn?.addEventListener('click', () => UI.clearToasts()));

// Submit Handling
elements.form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const file = elements.imageInput.files?.[0];
  if (!file) return UI.showToast('error', 'Please select an image first.');

  UI.clearToasts();
  UI.setLoading(true);

  try {
    const formData = new FormData();
    formData.append('image', file);
    if (elements.imageName.value.trim()) formData.append('name', elements.imageName.value.trim());
    if (elements.imageFormat.value) formData.append('format', elements.imageFormat.value);

    const { blob, filename } = await API.optimize(formData);

    Utils.downloadBlob(blob, filename);

    const diff = file.size - blob.size;
    const savingsText = diff > 0
      ? `Saved ${Utils.formatSize(diff)} (${Math.round((diff / file.size) * 100)}%)`
      : `Processed successfully (${Utils.formatSize(blob.size)})`;

    UI.showToast('success', `
      <strong>${filename}</strong> downloaded!<br>
      Check your Downloads folder.<br>
      <span class="mt-1 inline-block opacity-80 text-xs font-mono uppercase tracking-wider">${savingsText}</span>
    `);

  } catch (err: any) {
    UI.showToast('error', err.message);
  } finally {
    UI.setLoading(false);
  }
});
