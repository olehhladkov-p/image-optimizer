interface Elements {
  form: HTMLFormElement;
  imageInput: HTMLInputElement;
  imageName: HTMLInputElement;
  nameInputWrapper: HTMLDivElement;
  imageFormat: HTMLSelectElement;
  errorBanner: HTMLDivElement;
  errorMessage: HTMLSpanElement;
  successBanner: HTMLDivElement;
  successMessage: HTMLDivElement;
  submitBtn: HTMLButtonElement;
  resetButtons: HTMLButtonElement[];
  closeButtons: HTMLButtonElement[];
  loadingSpinner: HTMLElement;
  imagePreview: HTMLImageElement;
  previewGrid: HTMLDivElement;
  uploadIcon: HTMLDivElement;
  uploadText: HTMLParagraphElement;
  uploadSubtext: HTMLParagraphElement;
}

const getElement = <T extends HTMLElement>(id: string): T | null => {
  return document.getElementById(id) as T | null;
};

const elements: Elements = {
  form: getElement<HTMLFormElement>('optimizerForm')!,
  imageInput: getElement<HTMLInputElement>('imageInput')!,
  imageName: getElement<HTMLInputElement>('imageName')!,
  nameInputWrapper: getElement<HTMLDivElement>('nameInputWrapper')!,
  imageFormat: getElement<HTMLSelectElement>('imageFormat')!,
  errorBanner: getElement<HTMLDivElement>('errorBanner')!,
  errorMessage: getElement<HTMLSpanElement>('errorMessage')!,
  successBanner: getElement<HTMLDivElement>('successBanner')!,
  successMessage: getElement<HTMLDivElement>('successMessage')!,
  submitBtn: getElement<HTMLButtonElement>('submitBtn')!,
  resetButtons: [
    getElement<HTMLButtonElement>('resetBtn'),
    getElement<HTMLButtonElement>('successResetBtn')
  ].filter((btn): btn is HTMLButtonElement => btn !== null),
  closeButtons: [
    getElement<HTMLButtonElement>('closeErrorBtn'),
    getElement<HTMLButtonElement>('closeSuccessBtn')
  ].filter((btn): btn is HTMLButtonElement => btn !== null),
  loadingSpinner: getElement<HTMLElement>('loadingSpinner')!,
  imagePreview: getElement<HTMLImageElement>('imagePreview')!,
  previewGrid: getElement<HTMLDivElement>('previewGrid')!,
  uploadIcon: getElement<HTMLDivElement>('uploadIcon')!,
  uploadText: getElement<HTMLParagraphElement>('uploadText')!,
  uploadSubtext: getElement<HTMLParagraphElement>('uploadSubtext')!,
};

const formatSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'] as const;
  const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
  return parseFloat((bytes / (k ** i)).toFixed(2)) + ' ' + sizes[i];
};

const downloadBlob = (blob: Blob, filename: string): void => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  requestAnimationFrame(() => {
    window.URL.revokeObjectURL(url);
    a.remove();
  });
};

const readFileAsDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });
};

const showToast = (type: 'error' | 'success', msg: string | Node[]): void => {
  const isError = type === 'error';
  const target = isError ? elements.errorBanner : elements.successBanner;
  const other = isError ? elements.successBanner : elements.errorBanner;
  const msgTarget = isError ? elements.errorMessage : elements.successMessage;

  msgTarget.innerHTML = '';
  if (typeof msg === 'string') {
    msgTarget.textContent = msg;
  } else {
    msg.forEach(node => msgTarget.appendChild(node));
  }

  target.classList.remove('hidden');
  other.classList.add('hidden');
  requestAnimationFrame(() => target.focus());
};

const clearToasts = (): void => {
  elements.errorBanner.classList.add('hidden');
  elements.successBanner.classList.add('hidden');
};

const setLoading = (isLoading: boolean): void => {
  elements.submitBtn.disabled = isLoading;
  elements.submitBtn.setAttribute('aria-busy', String(isLoading));
  elements.submitBtn.classList.toggle('opacity-75', isLoading);
  elements.submitBtn.classList.toggle('cursor-not-allowed', isLoading);
  elements.loadingSpinner.classList.toggle('hidden', !isLoading);
};

const resetForm = (): void => {
  elements.form.reset();
  elements.imagePreview.src = '';
  elements.imagePreview.classList.add('hidden');
  elements.previewGrid.innerHTML = '';
  elements.previewGrid.classList.remove('grid', 'grid-cols-2', 'sm:grid-cols-3', 'gap-2');
  elements.previewGrid.classList.add('hidden');
  elements.nameInputWrapper.classList.remove('hidden');
  [elements.uploadIcon, elements.uploadText, elements.uploadSubtext].forEach(el => el.classList.remove('hidden'));
  clearToasts();
  elements.imageInput.focus();
};

const handleFilePreview = async (files: FileList): Promise<void> => {
  clearToasts();
  elements.previewGrid.innerHTML = '';
  [elements.uploadIcon, elements.uploadText, elements.uploadSubtext].forEach(el => el.classList.add('hidden'));

  if (files.length === 1) {
    const file = files[0]!;
    elements.imagePreview.src = await readFileAsDataUrl(file);
    elements.imagePreview.classList.remove('hidden');
    elements.previewGrid.classList.add('hidden');
    elements.previewGrid.classList.remove('grid', 'grid-cols-2', 'sm:grid-cols-3', 'gap-2');

    const parts = file.name.split('.');
    elements.imageName.value = parts.slice(0, -1).join('.');
    elements.nameInputWrapper.classList.remove('hidden');

    const ext = parts.pop()?.toLowerCase() ?? '';
    const supported = Array.from(elements.imageFormat.options).map(o => o.value);
    elements.imageFormat.value = supported.includes(ext) ? ext : '';
  } else {
    elements.imagePreview.classList.add('hidden');
    elements.previewGrid.classList.remove('hidden');
    elements.previewGrid.classList.add('grid', 'grid-cols-2', 'sm:grid-cols-3', 'gap-2');
    elements.nameInputWrapper.classList.add('hidden');

    const dataUrls = await Promise.all(Array.from(files).map(readFileAsDataUrl));
    dataUrls.forEach(src => {
      const img = document.createElement('img');
      img.src = src;
      img.className = 'w-full h-20 object-cover rounded shadow-sm';
      elements.previewGrid.appendChild(img);
    });
  }
};

elements.imageInput.addEventListener('change', async (e) => {
  const files = (e.target as HTMLInputElement).files;
  if (!files || files.length === 0) return resetForm();
  await handleFilePreview(files);
});

elements.resetButtons.forEach(btn => btn.addEventListener('click', resetForm));
elements.closeButtons.forEach(btn => btn.addEventListener('click', clearToasts));

elements.form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const files = elements.imageInput.files;
  if (!files || files.length === 0) return showToast('error', 'Please select images first.');

  clearToasts();
  setLoading(true);

  try {
    const formData = new FormData();
    Array.from(files).forEach(file => formData.append('images', file));

    if (files.length === 1 && elements.imageName.value.trim()) {
      formData.append('name', elements.imageName.value.trim());
    }
    if (elements.imageFormat.value) {
      formData.append('format', elements.imageFormat.value);
    }

    const response = await fetch('/optimize', { method: 'POST', body: formData });

    if (!response.ok) {
      const data = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(data.error || 'The server failed to optimize.');
    }

    const blob = await response.blob();
    const disposition = response.headers.get('content-disposition');
    const filename = disposition?.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)?.[1]?.replace(/['"]/g, '') ?? 'optimized.zip';

    downloadBlob(blob, filename);

    const originalSize = Array.from(files).reduce((acc, f) => acc + f.size, 0);
    const saved = originalSize - blob.size;

    const strong = document.createElement('strong');
    strong.textContent = filename;
    const br = document.createElement('br');
    const span = document.createElement('span');
    span.className = 'mt-1 inline-block opacity-80 text-xs font-mono uppercase tracking-wider';
    span.textContent = saved > 0
      ? `Saved ${formatSize(saved)} (${Math.round((saved / originalSize) * 100)}%)`
      : `Processed successfully (${formatSize(blob.size)})`;

    showToast('success', [strong, document.createTextNode(' downloaded!'), br, span]);
  } catch (err) {
    showToast('error', err instanceof Error ? err.message : 'An unknown error occurred');
  } finally {
    setLoading(false);
  }
});
