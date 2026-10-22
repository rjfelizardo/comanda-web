import { supabaseBrowser } from '@/lib/supabase/client';

// Reduz a imagem no navegador (max 1200px, JPEG) e envia para o bucket comanda-media.
export async function uploadImage(businessId: string, file: File, max = 1200): Promise<string> {
  const blob = await shrink(file, max);
  const supabase = supabaseBrowser();
  const path = `${businessId}/${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage.from('comanda-media').upload(path, blob, {
    contentType: 'image/jpeg',
    cacheControl: '31536000',
  });
  if (error) throw error;
  return supabase.storage.from('comanda-media').getPublicUrl(path).data.publicUrl;
}

function shrink(file: File, max: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      c.toBlob((b) => (b ? resolve(b) : reject(new Error('Falha ao processar a imagem'))), 'image/jpeg', 0.85);
    };
    img.onerror = () => reject(new Error('Imagem inválida'));
    img.src = url;
  });
}
