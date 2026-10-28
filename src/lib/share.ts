/** Native share sheet on phones, clipboard elsewhere, with a fallback for old browsers. */
export async function shareOrCopy(text: string): Promise<void> {
  try {
    if (navigator.share && matchMedia('(pointer: coarse)').matches) await navigator.share({ text });
    else await navigator.clipboard.writeText(text);
  } catch {
    const t = document.createElement('textarea');
    t.value = text;
    document.body.append(t);
    t.select();
    document.execCommand('copy');
    t.remove();
  }
}
