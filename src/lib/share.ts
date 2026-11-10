/** Native share sheet on phones, clipboard elsewhere, with a fallback for old browsers. Returns 'copied' when it used the clipboard. */
export async function shareOrCopy(text: string): Promise<'shared' | 'copied'> {
  try {
    if (navigator.share && matchMedia('(pointer: coarse)').matches) {
      await navigator.share({ text });
      return 'shared';
    }
    await navigator.clipboard.writeText(text);
  } catch {
    const t = document.createElement('textarea');
    t.value = text;
    document.body.append(t);
    t.select();
    document.execCommand('copy');
    t.remove();
  }
  return 'copied';
}
